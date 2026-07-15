import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SearchController } from '../search/search.controller';
import { SearchService } from '../search/search.service';
import { ReferenceLookupController } from '../reference-lookup/reference-lookup.controller';
import { ReferenceLookupService } from '../reference-lookup/reference-lookup.service';
import { InvoiceDocumentTemplatesService } from '../invoices/invoice-document-templates.service';
import { InvoicesController } from '../invoices/invoices.controller';
import { InvoicesService } from '../invoices/invoices.service';
import { ProductsController } from '../products/products.controller';
import { ProductsService } from '../products/products.service';

const allowGuard = { canActivate: () => true };

describe('OpenAPI response schemas (contractualisation)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        SearchController,
        ReferenceLookupController,
        AuditController,
        InvoicesController,
        ProductsController,
      ],
      providers: [
        { provide: SearchService, useValue: { globalSearch: jest.fn() } },
        {
          provide: ReferenceLookupService,
          useValue: { findByLevelOrRef: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: {
            getEntityLogs: jest.fn(),
            getUserLogs: jest.fn(),
            getAllLogs: jest.fn(),
          },
        },
        {
          provide: InvoicesService,
          useValue: {
            listTemplates: jest.fn(),
            getTemplate: jest.fn(),
            upsertTemplate: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            listDocuments: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            recordPayment: jest.fn(),
            uploadDocument: jest.fn(),
            replaceDocument: jest.fn(),
            deleteDocument: jest.fn(),
            getDocumentBinary: jest.fn(),
            markPaid: jest.fn(),
            downloadPdf: jest.fn(),
          },
        },
        {
          provide: InvoiceDocumentTemplatesService,
          useValue: {
            list: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setDefault: jest.fn(),
            preview: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            listImages: jest.fn(),
            uploadImages: jest.fn(),
            replaceImage: jest.fn(),
            deleteImage: jest.fn(),
            getImageBinary: jest.fn(),
            getTechnicalSheet: jest.fn(),
            upsertTechnicalSheet: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AdminGuard)
      .useValue(allowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function buildDocument() {
    return SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Raffia Weave Flow API')
        .setDescription(
          'Fragment OpenAPI des modules contractualisés (search/reference-lookup/audit/templates/images). Document complet: GET /{SWAGGER_PATH}-json sur l’API vivante.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    );
  }

  it('publie GlobalSearchResponseDto pour GET /search/global', () => {
    const document = buildDocument();
    const schemaNames = Object.keys(document.components?.schemas ?? {});
    expect(schemaNames).toEqual(
      expect.arrayContaining([
        'GlobalSearchResponseDto',
        'SearchHitResponseDto',
        'GlobalSearchGroupedResponseDto',
      ]),
    );

    const response = document.paths['/search/global']?.get?.responses?.['200'];
    expect(response).toBeDefined();
    expect(JSON.stringify(response)).toContain('GlobalSearchResponseDto');
  });

  it('publie ReferenceLookupResponseDto pour GET /reference-lookup', () => {
    const document = buildDocument();
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining(['ReferenceLookupResponseDto']),
    );
    const response = document.paths['/reference-lookup']?.get?.responses?.['200'];
    expect(JSON.stringify(response)).toContain('ReferenceLookupResponseDto');
  });

  it('publie AuditLogResponseDto pour les endpoints audit-logs', () => {
    const document = buildDocument();
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining(['AuditLogResponseDto', 'AuditLogUserResponseDto']),
    );

    const entityPath =
      document.paths['/audit-logs/entity/{entityType}/{entityId}']?.get
        ?.responses?.['200'];
    expect(JSON.stringify(entityPath)).toContain('AuditLogResponseDto');
  });

  it('publie InvoiceTemplateResponseDto pour /invoices/templates', () => {
    const document = buildDocument();
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining(['InvoiceTemplateResponseDto']),
    );
    const list = document.paths['/invoices/templates']?.get?.responses?.['200'];
    expect(JSON.stringify(list)).toContain('InvoiceTemplateResponseDto');
  });

  it('publie InvoiceDocumentTemplateResponseDto pour /invoices/document-templates', () => {
    const document = buildDocument();
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        'InvoiceDocumentTemplateResponseDto',
        'InvoiceDocumentContentDto',
        'InvoiceDocumentTemplatePreviewResponseDto',
      ]),
    );
    const list =
      document.paths['/invoices/document-templates']?.get?.responses?.['200'];
    expect(JSON.stringify(list)).toContain('InvoiceDocumentTemplateResponseDto');
    const preview =
      document.paths['/invoices/document-templates/{id}/preview']?.post
        ?.responses?.['200'];
    expect(JSON.stringify(preview)).toContain(
      'InvoiceDocumentTemplatePreviewResponseDto',
    );
  });

  it('publie ProductImageResponseDto pour /products/{id}/images', () => {
    const document = buildDocument();
    expect(Object.keys(document.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        'ProductImageResponseDto',
        'ReplaceProductImageResponseDto',
        'DeleteProductImageResponseDto',
      ]),
    );
    const list = document.paths['/products/{id}/images']?.get?.responses?.['200'];
    expect(JSON.stringify(list)).toContain('ProductImageResponseDto');
  });

  it('écrit un swagger.json (modules contractualisés) à la racine', () => {
    const document = buildDocument();
    const outPath = join(process.cwd(), 'swagger.json');
    writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

    const schemas = Object.keys(document.components?.schemas ?? {});
    expect(schemas).toEqual(
      expect.arrayContaining([
        'GlobalSearchResponseDto',
        'ReferenceLookupResponseDto',
        'AuditLogResponseDto',
        'InvoiceTemplateResponseDto',
        'InvoiceDocumentTemplateResponseDto',
        'ProductImageResponseDto',
      ]),
    );
  });
});
