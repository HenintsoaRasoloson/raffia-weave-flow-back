import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClientStatus,
  ClientType,
  DeliveryStatus,
  InvoiceStatus,
  InvoiceType,
  ProductStatus,
  ProductionStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
} from '../generated/prisma/client';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildFrenchTableTextWhere,
  containsFilter,
  equalsFilter,
  prepareSearchTerm,
  resolveFrenchTextSearchIds,
} from '../common/query/search.util';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';

const ALL_ENTITIES = GlobalSearchQueryDto.AllowedEntities;

type SearchEntity = (typeof ALL_ENTITIES)[number];

type SearchHit = {
  entity: SearchEntity;
  id: string;
  label: string;
  secondary?: string;
  reference?: string;
  status?: string;
  type?: string;
  referenceLevel?: number | null;
  createdAt?: Date;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(query: GlobalSearchQueryDto) {
    const startedAt = Date.now();
    const q = prepareSearchTerm(query.q) ?? '';
    const limit = query.limit ?? 8;
    const entities = this.resolveEntities(query.entities);
    const matchMode = query.matchMode ?? 'contains';
    const referenceLevelHint =
      query.referenceLevel ?? this.extractReferenceLevelFromQuery(q);

    if (!q && referenceLevelHint === undefined) {
      throw new BadRequestException(
        'Le parametre q (ou referenceLevel) est requis pour la recherche globale.',
      );
    }

    const createdAtFilter = this.buildCreatedAtFilter(query.dateFrom, query.dateTo);

    const tasks: Promise<[SearchEntity, SearchHit[]]>[] = [];

    if (entities.includes('products')) {
      tasks.push(
        this.searchProducts({
          q,
          limit,
          matchMode,
          status: query.status,
          categoryId: query.categoryId,
          createdAtFilter,
        }).then((hits) => ['products', hits]),
      );
    }

    if (entities.includes('clients')) {
      tasks.push(
        this.searchClients({ q, limit, status: query.status, createdAtFilter }).then((hits) => [
          'clients',
          hits,
        ]),
      );
    }

    if (entities.includes('suppliers')) {
      tasks.push(
        this.searchSuppliers({ q, limit, createdAtFilter }).then((hits) => [
          'suppliers',
          hits,
        ]),
      );
    }

    if (entities.includes('components')) {
      tasks.push(
        this.searchComponents({
          q,
          limit,
          matchMode,
          supplierId: query.supplierId,
          createdAtFilter,
        }).then((hits) => ['components', hits]),
      );
    }

    if (entities.includes('salesOrders')) {
      tasks.push(
        this.searchSalesOrders({
          q,
          limit,
          matchMode,
          status: query.status,
          type: query.type,
          clientId: query.clientId,
          createdAtFilter,
          referenceLevel: referenceLevelHint,
        }).then((hits) => ['salesOrders', hits]),
      );
    }

    if (entities.includes('invoices')) {
      tasks.push(
        this.searchInvoices({
          q,
          limit,
          matchMode,
          status: query.status,
          type: query.type,
          clientId: query.clientId,
          createdAtFilter,
          referenceLevel: referenceLevelHint,
        }).then((hits) => ['invoices', hits]),
      );
    }

    if (entities.includes('deliveries')) {
      tasks.push(
        this.searchDeliveries({
          q,
          limit,
          matchMode,
          status: query.status,
          clientId: query.clientId,
          createdAtFilter,
          referenceLevel: referenceLevelHint,
        }).then((hits) => ['deliveries', hits]),
      );
    }

    if (entities.includes('productionOrders')) {
      tasks.push(
        this.searchProductionOrders({
          q,
          limit,
          matchMode,
          status: query.status,
          createdAtFilter,
          referenceLevel: referenceLevelHint,
        }).then((hits) => ['productionOrders', hits]),
      );
    }

    if (entities.includes('purchaseOrders')) {
      tasks.push(
        this.searchPurchaseOrders({
          q,
          limit,
          matchMode,
          status: query.status,
          supplierId: query.supplierId,
          createdAtFilter,
          referenceLevel: referenceLevelHint,
        }).then((hits) => ['purchaseOrders', hits]),
      );
    }

    const results = await Promise.all(tasks);
    const grouped = Object.fromEntries(results) as Record<SearchEntity, SearchHit[]>;

    const flat = results
      .flatMap(([, items]) => items)
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

    const counts = Object.fromEntries(
      results.map(([entity, items]) => [entity, items.length]),
    ) as Record<string, number>;

    return {
      query: q,
      entities,
      matchMode,
      tookMs: Date.now() - startedAt,
      total: flat.length,
      counts,
      grouped,
      results: flat,
    };
  }

  private resolveEntities(rawEntities?: string): SearchEntity[] {
    if (!rawEntities?.trim()) {
      return [...ALL_ENTITIES];
    }

    const parsed = rawEntities
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean) as SearchEntity[];

    const invalid = parsed.filter((v) => !ALL_ENTITIES.includes(v));
    if (invalid.length) {
      throw new BadRequestException(
        `Entites invalides: ${invalid.join(', ')}. Entites valides: ${ALL_ENTITIES.join(', ')}`,
      );
    }

    return Array.from(new Set(parsed));
  }

  private buildCreatedAtFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    return {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  private extractReferenceLevelFromQuery(q: string) {
    if (!q) {
      return undefined;
    }

    const m = q.toUpperCase().match(/^[A-Z]{2,4}\/(\d{6})$/);
    return m ? Number(m[1]) : undefined;
  }

  private buildStringMatch(q: string, mode: 'contains' | 'exact') {
    if (!q) {
      return undefined;
    }

    if (mode === 'exact') {
      return equalsFilter(q);
    }

    return containsFilter(q);
  }

  private async searchProducts(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    categoryId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const nameIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Product', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { ref: textMatch },
          ...(nameIds.length ? [{ id: { in: nameIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.product.findMany({
      where: {
        ...enumWhere('status', input.status, ProductStatus),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        ref: true,
        name: true,
        status: true,
        createdAt: true,
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'products',
      id: r.id,
      label: r.name,
      secondary: r.ref,
      reference: r.ref,
      status: String(r.status),
      createdAt: r.createdAt,
    }));
  }

  private async searchClients(input: {
    q: string;
    limit: number;
    status?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textWhere = q
      ? await buildFrenchTableTextWhere(this.prisma, 'Client', ['name', 'email', 'contactName'], q)
      : {};

    const rows = await this.prisma.client.findMany({
      where: {
        ...enumWhere('status', input.status, ClientStatus),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...textWhere,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'clients',
      id: r.id,
      label: r.name,
      secondary: r.email ?? undefined,
      status: String(r.status),
      createdAt: r.createdAt,
    }));
  }

  private async searchSuppliers(input: {
    q: string;
    limit: number;
    createdAtFilter?: { gte?: Date; lte?: Date };
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textWhere = q
      ? await buildFrenchTableTextWhere(this.prisma, 'Supplier', ['name', 'email', 'category'], q)
      : {};

    const rows = await this.prisma.supplier.findMany({
      where: {
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...textWhere,
      },
      select: {
        id: true,
        name: true,
        email: true,
        category: true,
        createdAt: true,
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'suppliers',
      id: r.id,
      label: r.name,
      secondary: r.category ?? r.email ?? undefined,
      createdAt: r.createdAt,
    }));
  }

  private async searchComponents(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    supplierId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const nameIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Component', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { ref: textMatch },
          ...(nameIds.length ? [{ id: { in: nameIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.component.findMany({
      where: {
        ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        ref: true,
        name: true,
        createdAt: true,
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'components',
      id: r.id,
      label: r.name,
      secondary: r.ref,
      reference: r.ref,
      createdAt: r.createdAt,
    }));
  }

  private async searchSalesOrders(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    type?: string;
    clientId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
    referenceLevel?: number;
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const clientIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Client', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { orderNumber: textMatch },
          ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.salesOrder.findMany({
      where: {
        ...enumWhere('status', input.status, SalesOrderStatus),
        ...enumWhere('orderType', input.type, ClientType),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(input.referenceLevel !== undefined
          ? { referenceLevel: input.referenceLevel }
          : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        referenceLevel: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'salesOrders',
      id: r.id,
      label: r.orderNumber,
      secondary: r.client?.name ?? undefined,
      reference: r.orderNumber,
      status: String(r.status),
      type: String(r.orderType),
      referenceLevel: r.referenceLevel,
      createdAt: r.createdAt,
    }));
  }

  private async searchInvoices(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    type?: string;
    clientId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
    referenceLevel?: number;
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const clientIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Client', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { invoiceNumber: textMatch },
          ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.invoice.findMany({
      where: {
        ...enumWhere('status', input.status, InvoiceStatus),
        ...enumWhere('type', input.type, InvoiceType),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(input.referenceLevel !== undefined
          ? { referenceLevel: input.referenceLevel }
          : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        type: true,
        referenceLevel: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'invoices',
      id: r.id,
      label: r.invoiceNumber,
      secondary: r.client?.name ?? undefined,
      reference: r.invoiceNumber,
      status: String(r.status),
      type: String(r.type),
      referenceLevel: r.referenceLevel,
      createdAt: r.createdAt,
    }));
  }

  private async searchDeliveries(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    clientId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
    referenceLevel?: number;
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const clientIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Client', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { deliveryNumber: textMatch },
          ...(clientIds.length ? [{ clientId: { in: clientIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.delivery.findMany({
      where: {
        ...enumWhere('status', input.status, DeliveryStatus),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(input.referenceLevel !== undefined
          ? { referenceLevel: input.referenceLevel }
          : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        deliveryNumber: true,
        status: true,
        referenceLevel: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'deliveries',
      id: r.id,
      label: r.deliveryNumber,
      secondary: r.client?.name ?? undefined,
      reference: r.deliveryNumber,
      status: String(r.status),
      referenceLevel: r.referenceLevel,
      createdAt: r.createdAt,
    }));
  }

  private async searchProductionOrders(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
    referenceLevel?: number;
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const productIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Product', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { orderNumber: textMatch },
          ...(productIds.length ? [{ productId: { in: productIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.productionOrder.findMany({
      where: {
        ...enumWhere('status', input.status, ProductionStatus),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(input.referenceLevel !== undefined
          ? { referenceLevel: input.referenceLevel }
          : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        referenceLevel: true,
        createdAt: true,
        product: { select: { name: true } },
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'productionOrders',
      id: r.id,
      label: r.orderNumber,
      secondary: r.product?.name ?? undefined,
      reference: r.orderNumber,
      status: String(r.status),
      referenceLevel: r.referenceLevel,
      createdAt: r.createdAt,
    }));
  }

  private async searchPurchaseOrders(input: {
    q: string;
    limit: number;
    matchMode: 'contains' | 'exact';
    status?: string;
    supplierId?: string;
    createdAtFilter?: { gte?: Date; lte?: Date };
    referenceLevel?: number;
  }): Promise<SearchHit[]> {
    const q = prepareSearchTerm(input.q);
    const textMatch = q ? this.buildStringMatch(q, input.matchMode) : undefined;
    const supplierIds = q
      ? await resolveFrenchTextSearchIds(this.prisma, 'Supplier', ['name'], q)
      : [];
    const textOr = textMatch
      ? [
          { orderNumber: textMatch },
          ...(supplierIds.length ? [{ supplierId: { in: supplierIds } }] : []),
        ]
      : undefined;

    const rows = await this.prisma.purchaseOrder.findMany({
      where: {
        ...enumWhere('status', input.status, PurchaseOrderStatus),
        ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        ...(input.createdAtFilter ? { createdAt: input.createdAtFilter } : {}),
        ...(input.referenceLevel !== undefined
          ? { referenceLevel: input.referenceLevel }
          : {}),
        ...(textOr ? { OR: textOr } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        referenceLevel: true,
        createdAt: true,
        supplier: { select: { name: true } },
      },
      take: input.limit,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      entity: 'purchaseOrders',
      id: r.id,
      label: r.orderNumber,
      secondary: r.supplier?.name ?? undefined,
      reference: r.orderNumber,
      status: String(r.status),
      referenceLevel: r.referenceLevel,
      createdAt: r.createdAt,
    }));
  }
}
