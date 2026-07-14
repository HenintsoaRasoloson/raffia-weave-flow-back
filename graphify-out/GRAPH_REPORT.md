# Graph Report - raffia-weave-flow-back  (2026-07-14)

## Corpus Check
- 232 files · ~59,602 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2070 nodes · 4104 edges · 112 communities (103 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3da84c3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sales-orders.service.ts
- auth.service.ts
- catalog-shares.controller.ts
- search.util.ts
- production-orders.controller.ts
- bom-items.controller.ts
- components.controller.ts
- ListQueryDto
- CreateUserDto
- DashboardService
- colors.controller.ts
- Financial Tracking API
- 🎯 Notifications System - Complete Implementation Summary
- ProductsController
- Frontend Integration - Suivi financier
- devDependencies
- InvoicesController
- FinancialTrackingService
- clients.controller.ts
- financial-tracking.service.ts
- FinancialTrackingController
- ClientsController
- NotificationsService
- PurchaseOrdersController
- InvoicesService
- invoices.service.ts
- ReferenceLookupQueryDto
- dependencies
- 🔔 Système de Notifications WebSocket
- app.module.ts
- compilerOptions
- AuditService
- SuppliersController
- Summary of Work Completed
- ✅ NOTIFICATIONS SYSTEM - FINAL CHECKLIST
- ProductsService
- DeliveriesController
- CreatePurchaseOrderDto
- scripts
- UpsertProductTechnicalSheetDto
- company-settings.controller.ts
- AppController
- deliveries.controller.ts
- purchase-orders.controller.ts
- products.controller.ts
- suppliers.controller.ts
- CreateInvoiceDto
- CreateSupplierDto
- ClientsService
- CompanySettingsController
- dashboard.module.ts
- CreateProductDto
- GED + MinIO (Docker) - Structure recommandee
- main.ts
- MinioService
- PrismaService
- README.md
- clients.module.ts
- .downloadDocument
- Dashboard - Checklist de Conformité
- Conformité au Design Frontend (Raphia ERP)
- Endpoints
- Dashboard Backend - Quick Start Guide
- AdminGuard
- .isEnabled
- DeliveriesService
- BudgetAlertQueryDto
- CreateFinancialBudgetDto
- CreateLedgerEntryDto
- ListLedgerEntriesQueryDto
- PurchaseOrdersService
- jest
- FinancialOverviewQueryDto
- ged-paths.service.ts
- RecordPaymentDto
- RecordPurchaseOrderPaymentDto
- ApiExceptionFilter
- Dashboard Frontend Integration Guide
- CreateLedgerCategoryDto
- UpdateSupplierDto
- Dashboard API - Documentation
- nest-cli.json
- package.json
- Installation Frontend
- Suivi financier
- Points Clés pour Implémentation Frontend
- .findAll
- 🚀 Démarrage rapide
- 💻 Frontend - Prochaines étapes
- Documentation
- .findAll
- .findAll
- .prettierrc.json
- seed.ts
- AuthModule
- tsconfig.build.json
- auth-session.dto.ts
- ReplaceClientFiscalCardDto
- document-reference.module.ts
- .findAll
- Agent Back-End : Architecte NestJS & Clean Code
- Agent Back-QA : Tests NestJS (Jest & Supertest)
- Agent Swagger & Documentation API
- UploadClientFiscalCardDto
- UpsertInvoiceTemplateDto
- CatalogShareProductResponseDto

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 92 edges
2. `ListQueryDto` - 67 edges
3. `FinancialTrackingService` - 38 edges
4. `InvoicesService` - 29 edges
5. `JwtAccessPayload` - 28 edges
6. `SalesOrdersService` - 27 edges
7. `CurrentUser` - 26 edges
8. `NotificationsService` - 26 edges
9. `ProductsService` - 26 edges
10. `enumWhere()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  src/main.ts → src/app.module.ts
- `ApiPaginatedResponse()` --indirect_call--> `PaginatedResponseDto`  [INFERRED]
  src/common/swagger/api-paginated-response.decorator.ts → src/common/swagger/paginated-response.dto.ts
- `AuthSessionDto` --references--> `AuthUserDto`  [EXTRACTED]
  src/auth/dto/auth-session.dto.ts → src/auth/dto/auth-user.dto.ts
- `CatalogShareResponseDto` --references--> `CatalogShareProductResponseDto`  [EXTRACTED]
  src/catalog-shares/dto/catalog-share-response.dto.ts → src/catalog-shares/dto/catalog-share-product-response.dto.ts
- `NotificationPayload` --references--> `NotificationType`  [EXTRACTED]
  src/notifications/notifications.service.ts → src/notifications/notification.types.ts

## Import Cycles
- None detected.

## Communities (112 total, 9 thin omitted)

### Community 0 - "sales-orders.service.ts"
Cohesion: 0.18
Nodes (14): SalesOrdersController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Controller, Delete (+6 more)

### Community 1 - "auth.service.ts"
Cohesion: 0.06
Nodes (38): AuthController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+30 more)

### Community 2 - "catalog-shares.controller.ts"
Cohesion: 0.13
Nodes (14): ApiCreatedResponse, Post, CreateCatalogShareDto, ApiProperty, ApiPropertyOptional, IsArray, IsDateString, IsIn (+6 more)

### Community 3 - "search.util.ts"
Cohesion: 0.07
Nodes (38): buildContainsOr(), buildFrenchTableTextWhere(), containsFilter(), equalsFilter(), escapeLikePattern(), foldDiacritics(), foldFrenchSql(), InsensitiveEqualsFilter (+30 more)

### Community 4 - "production-orders.controller.ts"
Cohesion: 0.17
Nodes (16): ProductionOrdersController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Body (+8 more)

### Community 5 - "bom-items.controller.ts"
Cohesion: 0.06
Nodes (36): BomItemsController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Body (+28 more)

### Community 6 - "components.controller.ts"
Cohesion: 0.05
Nodes (40): ComponentsController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Body (+32 more)

### Community 7 - "ListQueryDto"
Cohesion: 0.08
Nodes (29): CategoriesController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+21 more)

### Community 8 - "CreateUserDto"
Cohesion: 0.06
Nodes (37): CreateUserDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsEmail, IsEnum, IsOptional, IsString (+29 more)

### Community 9 - "DashboardService"
Cohesion: 0.08
Nodes (25): SALES_ORDER_IN_PROGRESS_STATUSES, SALES_ORDER_STATUS_TRANSITIONS, SalesOrderStatusValue, DashboardController, Controller, Get, Query, DashboardService (+17 more)

### Community 10 - "colors.controller.ts"
Cohesion: 0.08
Nodes (28): ColorsController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+20 more)

### Community 11 - "Financial Tracking API"
Cohesion: 0.05
Nodes (36): 1. GET /financial-tracking/overview, 2. GET /financial-tracking/categories, 3. POST /financial-tracking/categories, 4. GET /financial-tracking/budgets, 5 bis. GET /financial-tracking/budget-alerts, 5. POST /financial-tracking/budgets, 5 ter. POST /financial-tracking/budget-alerts/notify, 6. GET /financial-tracking/ledger-entries (+28 more)

### Community 12 - "🎯 Notifications System - Complete Implementation Summary"
Cohesion: 0.06
Nodes (31): **1. SalesOrdersService** ✅, **2. InvoicesService** ✅, **3. ProductionOrdersService** ✅, **4. DeliveriesService** ✅, a) Pagamenti importanti (> 5000 EUR), 🔗 API Endpoints with Notifications, 🏗️ Architecture Details, b) Notifica sempre al responsabile finanziario (+23 more)

### Community 13 - "ProductsController"
Cohesion: 0.21
Nodes (14): ProductsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Controller, Delete (+6 more)

### Community 14 - "Frontend Integration - Suivi financier"
Cohesion: 0.07
Nodes (29): Alertes automatiques, Contenu recommande, Ecran 1 - Overview financier, Ecran 2 - Journal de tresorerie, Ecran 3 - Budgets et ecarts, Ecran 4 - Onglet finance sur fiche client, Ecran 5 - Paiement fournisseur, Effet frontend attendu (+21 more)

### Community 15 - "devDependencies"
Cohesion: 0.07
Nodes (30): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+22 more)

### Community 16 - "InvoicesController"
Cohesion: 0.17
Nodes (17): Put, InvoicesController, sanitizeFilename(), ApiBearerAuth, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiParam (+9 more)

### Community 18 - "clients.controller.ts"
Cohesion: 0.18
Nodes (10): JwtAccessPayload, CurrentUser, ClientResponseDto, ApiProperty, ApiPropertyOptional, SalesOrderResponseDto, ApiProperty, ApiProperty (+2 more)

### Community 19 - "financial-tracking.service.ts"
Cohesion: 0.10
Nodes (20): BUDGET_DIRECTIONS, LEDGER_ENTRY_TYPES, LEDGER_ENTRY_TYPES, ListFinancialBudgetsQueryDto, ApiPropertyOptional, IsDateString, IsOptional, IsString (+12 more)

### Community 20 - "FinancialTrackingController"
Cohesion: 0.18
Nodes (14): FinancialTrackingController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, Body (+6 more)

### Community 21 - "ClientsController"
Cohesion: 0.05
Nodes (38): ClientsController, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiPaginatedResponse (+30 more)

### Community 22 - "NotificationsService"
Cohesion: 0.10
Nodes (10): NOTIFICATION_TYPES, NotificationType, NotificationsGateway, Injectable, NotificationPayload, NotificationsService, Injectable, SubscribeMessage (+2 more)

### Community 23 - "PurchaseOrdersController"
Cohesion: 0.07
Nodes (33): CreatePurchaseOrderDto, ApiProperty, ApiPropertyOptional, IsArray, IsDateString, IsIn, IsOptional, IsString (+25 more)

### Community 24 - "InvoicesService"
Cohesion: 0.14
Nodes (4): INVOICE_TYPES, InvoicesService, InvoiceTypeValue, Injectable

### Community 25 - "invoices.service.ts"
Cohesion: 0.11
Nodes (16): InvoiceResponseDto, ApiProperty, UpdateInvoiceDto, INVOICE_DOCUMENT_KINDS, ApiProperty, ApiPropertyOptional, IsIn, IsOptional (+8 more)

### Community 26 - "ReferenceLookupQueryDto"
Cohesion: 0.09
Nodes (19): ReferenceLookupQueryDto, ApiPropertyOptional, IsInt, IsOptional, IsString, Matches, Min, Transform (+11 more)

### Community 27 - "dependencies"
Cohesion: 0.06
Nodes (30): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, class-transformer, class-validator, dotenv, express-basic-auth (+22 more)

### Community 28 - "🔔 Système de Notifications WebSocket"
Cohesion: 0.08
Nodes (23): 1. Injecter le service dans ton module, 2. Injecter dans ton service, 3. Envoyer une notification, Alerte stock, 🚀 Architecture, 🎯 Cas d'usage, 🛠️ Configuration, Connexion et authentification (+15 more)

### Community 29 - "app.module.ts"
Cohesion: 0.09
Nodes (29): AuditModule, Module, DocumentReferenceModule, Global, Module, DashboardModule, Module, DeliveriesModule (+21 more)

### Community 30 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+14 more)

### Community 31 - "AuditService"
Cohesion: 0.13
Nodes (14): CompanySettingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+6 more)

### Community 32 - "SuppliersController"
Cohesion: 0.05
Nodes (40): CreateSupplierDto, ApiProperty, ApiPropertyOptional, IsEmail, IsNumber, IsOptional, IsString, Max (+32 more)

### Community 33 - "Summary of Work Completed"
Cohesion: 0.10
Nodes (20): 1. **Backend API** (7 endpoints), 2. **Service Layer**, 3. **Data Types** (TypeScript), 4. **Module Setup**, 5. **Documentation** (4 files), 🔧 Build Status, ✅ Dashboard Backend - Implementation Complete, ✅ Deliverables (+12 more)

### Community 34 - "✅ NOTIFICATIONS SYSTEM - FINAL CHECKLIST"
Cohesion: 0.10
Nodes (20): ✅ 1. SalesOrdersService Integration, ✅ 2. InvoicesService Integration, ✅ 3. ProductionOrdersService Integration, ✅ 4. DeliveriesService Integration, Build & Compilation, Documentation, Files Modified/Created, Not Included (Optional) (+12 more)

### Community 36 - "DeliveriesController"
Cohesion: 0.14
Nodes (16): DeliveriesController, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Body (+8 more)

### Community 37 - "CreatePurchaseOrderDto"
Cohesion: 0.12
Nodes (8): AuditService, Injectable, DocumentReferenceService, Injectable, DeliveriesService, Injectable, SalesOrdersService, Injectable

### Community 38 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, format, lint, prisma:generate, prisma:migrate:deploy, prisma:migrate:dev, prisma:seed (+10 more)

### Community 39 - "UpsertProductTechnicalSheetDto"
Cohesion: 0.14
Nodes (17): MATERIAL_UNITS, TECHNICAL_CATEGORIES, ApiProperty, ApiPropertyOptional, IsArray, IsBoolean, IsIn, IsInt (+9 more)

### Community 40 - "company-settings.controller.ts"
Cohesion: 0.12
Nodes (16): CreateProductionOrderDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsInt, IsOptional, IsString (+8 more)

### Community 41 - "AppController"
Cohesion: 0.18
Nodes (9): AppController, DocsIndexResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, AppService (+1 more)

### Community 42 - "deliveries.controller.ts"
Cohesion: 0.12
Nodes (16): PRODUCTION_STAGE_VALUES, ProductionStageValue, ApiProperty, ApiPropertyOptional, ArrayMinSize, IsArray, IsDateString, IsIn (+8 more)

### Community 43 - "purchase-orders.controller.ts"
Cohesion: 0.18
Nodes (11): CreateDeliveryDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsOptional, IsString, DeliveryResponseDto (+3 more)

### Community 44 - "products.controller.ts"
Cohesion: 0.23
Nodes (7): ProductResponseDto, ApiProperty, UpdateProductDto, ApiPropertyOptional, IsOptional, IsString, UploadProductImagesDto

### Community 45 - "suppliers.controller.ts"
Cohesion: 0.18
Nodes (12): CatalogSharesController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiPaginatedResponse, ApiTags, Controller, Delete (+4 more)

### Community 46 - "CreateInvoiceDto"
Cohesion: 0.18
Nodes (14): CreateInvoiceDto, CreateInvoiceItemDto, ApiProperty, ApiPropertyOptional, IsArray, IsDateString, IsIn, IsInt (+6 more)

### Community 47 - "CreateSupplierDto"
Cohesion: 0.17
Nodes (15): CreateSalesOrderDto, CreateSalesOrderItemDto, ApiProperty, ApiPropertyOptional, IsArray, IsDateString, IsIn, IsInt (+7 more)

### Community 49 - "CompanySettingsController"
Cohesion: 0.33
Nodes (7): ApiBody, ApiConsumes, ApiCreatedResponse, Body, Post, UploadedFile, UseInterceptors

### Community 50 - "dashboard.module.ts"
Cohesion: 0.33
Nodes (7): ApiBody, ApiConsumes, ApiCreatedResponse, Body, Post, UploadedFile, UseInterceptors

### Community 51 - "CreateProductDto"
Cohesion: 0.23
Nodes (13): CreateProductDto, CreateProductVariantDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsInt, IsNumber (+5 more)

### Community 52 - "GED + MinIO (Docker) - Structure recommandee"
Cohesion: 0.17
Nodes (11): Base NestJS preparee, Buckets, Cas d'usage couverts, Compression images, Domaines conseilles, Démarrage MinIO, GED + MinIO (Docker) - Structure recommandee, Hierarchie d'objets (+3 more)

### Community 53 - "main.ts"
Cohesion: 0.25
Nodes (6): ApiPropertyOptional, IsBoolean, IsOptional, IsString, MaxLength, UpdateCompanySettingsDto

### Community 54 - "MinioService"
Cohesion: 0.22
Nodes (7): ApiProperty, IsIn, IsInt, IsOptional, Max, Min, UpdateProductionProgressDto

### Community 55 - "PrismaService"
Cohesion: 0.18
Nodes (9): AuditLogInput, PrismaTransactionClient, EnumConst, toEnumValue(), compressBufferIfNeeded(), shouldCompressImage(), GED_ALLOWED_EXTENSIONS, PRODUCTION_STAGE_LABELS (+1 more)

### Community 56 - "README.md"
Cohesion: 0.18
Nodes (10): Compile and run the project, Deployment, Description, GED / MinIO, License, Project setup, Resources, Run tests (+2 more)

### Community 57 - "clients.module.ts"
Cohesion: 0.20
Nodes (10): AuditController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+2 more)

### Community 58 - ".downloadDocument"
Cohesion: 0.38
Nodes (3): Body, CatalogSharesService, Injectable

### Community 59 - "Dashboard - Checklist de Conformité"
Cohesion: 0.20
Nodes (5): Dashboard - Checklist de Conformité, Expected Response Format, Status: ✅ READY FOR FRONTEND INTEGRATION, Validation Endpoints, À tester:

### Community 60 - "Conformité au Design Frontend (Raphia ERP)"
Cohesion: 0.20
Nodes (10): ✅ Composants shadcn/ui, Conformité au Design Frontend (Raphia ERP), ✅ Documentation, ✅ Données & Business Logic, ✅ Palette Couleurs (Warm Sand), ✅ Performance, ✅ Responsive Design, ✅ Structure Visuelle (+2 more)

### Community 61 - "Endpoints"
Cohesion: 0.20
Nodes (10): Endpoints, GET `/dashboard`, GET `/dashboard/alerts`, GET `/dashboard/calendar`, GET `/dashboard/calendrier`, GET `/dashboard/kpis`, GET `/dashboard/production-orders`, GET `/dashboard/quick-stats` (+2 more)

### Community 62 - "Dashboard Backend - Quick Start Guide"
Cohesion: 0.20
Nodes (10): 🔍 Architecture, ✅ Build Status, 🎯 Ce qui a été créé, 🎨 Conforme au Design Frontend, Dashboard Backend - Quick Start Guide, 📝 Documentation Complète, 📊 Les 7 Endpoints, 🎯 Prochaine Étape (+2 more)

### Community 63 - "AdminGuard"
Cohesion: 0.25
Nodes (7): BAT_DOCUMENT_KINDS, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, UploadBatDocumentDto

### Community 64 - ".isEnabled"
Cohesion: 0.27
Nodes (8): ApiBody, ApiConsumes, ApiCreatedResponse, Body, Post, UploadedFile, UseInterceptors, UploadedFiles

### Community 65 - "DeliveriesService"
Cohesion: 0.20
Nodes (7): AuthModule, Global, Module, AdminGuard, Injectable, JwtAuthGuard, Injectable

### Community 66 - "BudgetAlertQueryDto"
Cohesion: 0.20
Nodes (10): BudgetAlertQueryDto, ApiPropertyOptional, IsDateString, IsInt, IsNumber, IsOptional, IsString, Max (+2 more)

### Community 67 - "CreateFinancialBudgetDto"
Cohesion: 0.20
Nodes (10): CreateFinancialBudgetDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsNumber, IsOptional, IsString (+2 more)

### Community 68 - "CreateLedgerEntryDto"
Cohesion: 0.20
Nodes (10): CreateLedgerEntryDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsNumber, IsOptional, IsString (+2 more)

### Community 69 - "ListLedgerEntriesQueryDto"
Cohesion: 0.20
Nodes (10): ListLedgerEntriesQueryDto, ApiPropertyOptional, IsDateString, IsIn, IsInt, IsOptional, IsString, Max (+2 more)

### Community 70 - "PurchaseOrdersService"
Cohesion: 0.20
Nodes (9): PurchaseOrderResponseDto, ApiProperty, ApiPropertyOptional, ApiPropertyOptional, IsDateString, IsIn, IsOptional, IsString (+1 more)

### Community 71 - "jest"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testRegex (+4 more)

### Community 72 - "FinancialOverviewQueryDto"
Cohesion: 0.11
Nodes (17): ListQueryDto, ApiPropertyOptional, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max (+9 more)

### Community 73 - "ged-paths.service.ts"
Cohesion: 0.10
Nodes (17): ClientsModule, Module, GedModule, Global, Module, GedPathsService, normalize(), shortSuffix() (+9 more)

### Community 74 - "RecordPaymentDto"
Cohesion: 0.18
Nodes (10): PAYMENT_METHODS, RecordPaymentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsNumber, IsOptional (+2 more)

### Community 75 - "RecordPurchaseOrderPaymentDto"
Cohesion: 0.18
Nodes (10): PAYMENT_METHODS, RecordPurchaseOrderPaymentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsIn, IsNumber, IsOptional (+2 more)

### Community 76 - "ApiExceptionFilter"
Cohesion: 0.14
Nodes (9): Catch, AppModule, Module, ApiErrorResponse, ApiExceptionFilter, ApiResponseInterceptor, ApiSuccessResponse, Injectable (+1 more)

### Community 77 - "Dashboard Frontend Integration Guide"
Cohesion: 0.25
Nodes (8): Architecture, Dashboard Frontend Integration Guide, Déclencheurs de notifications, Performance & Optimisation, Tester l'API en local, Testing, Troubleshooting, Vue d'ensemble

### Community 78 - "CreateLedgerCategoryDto"
Cohesion: 0.25
Nodes (8): CreateLedgerCategoryDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsIn, IsOptional, IsString, Length

### Community 79 - "UpdateSupplierDto"
Cohesion: 0.40
Nodes (4): ReplaceClientFiscalCardDto, ApiPropertyOptional, IsDateString, IsOptional

### Community 80 - "Dashboard API - Documentation"
Cohesion: 0.29
Nodes (7): Dashboard API - Documentation, Exemples d'utilisation (Frontend), Intégration avec le système de notifications, Notes d'implémentation, Performance & Caching, React Query avec TanStack React Router, Vue d'ensemble

### Community 81 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, builder, deleteOutDir, $schema, sourceRoot

### Community 82 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 83 - "Installation Frontend"
Cohesion: 0.33
Nodes (6): 1. Installer socket.io-client, 2. Créer un hook pour les notifications, 3. Créer un composant Notifications Toast, 4. Intégrer dans le Layout, 5. Créer la page Dashboard, Installation Frontend

### Community 84 - "Suivi financier"
Cohesion: 0.33
Nodes (5): Endpoints principaux, Fichiers, Notes metier, Objectif, Suivi financier

### Community 85 - "Points Clés pour Implémentation Frontend"
Cohesion: 0.40
Nodes (5): Import styles Tailwind (déjà dans project), Installation dépendances, Palette oklch dans tailwind.config, Points Clés pour Implémentation Frontend, Setup TanStack Query Provider

### Community 86 - ".findAll"
Cohesion: 0.25
Nodes (7): 1. Tolérance Zéro "Valeurs en dur" (Front & Back), 2. Architecture & Granularité (Micro-services / Micro-composants), 3. Gestion des Régressions & Typage Strict, Agent de Code Review (CR) : Gardien des Principes & Clean Code, 🔍 Grille d'Évaluation Systématique, 🎯 Objectif Principal, 🛠️ Protocole de Réponse de l'Agent CR

### Community 87 - "🚀 Démarrage rapide"
Cohesion: 0.50
Nodes (4): 1. Vérifier que ça compile, 2. Démarrer le serveur, 3. Tester un endpoint, 🚀 Démarrage rapide

### Community 88 - "💻 Frontend - Prochaines étapes"
Cohesion: 0.50
Nodes (4): A. Installation dépendances, B. Créer le composant Dashboard, C. Exemple React simple, 💻 Frontend - Prochaines étapes

### Community 89 - "Documentation"
Cohesion: 0.50
Nodes (3): Convention, Documentation, Structure

### Community 90 - ".findAll"
Cohesion: 0.18
Nodes (11): ApiPropertyOptional, IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength (+3 more)

### Community 91 - ".findAll"
Cohesion: 0.25
Nodes (7): Agent Orchestrateur : Superviseur d'Intégration (Full-Stack Bridge), 🛡️ Directives Strictes sur le Typage & Code Quality, 🎯 Objectif Principal, 🔄 Protocole de Résolution d'Anomalie (Workflow de l'Orchestrateur), Étape 1 : Le Diagnostic (Read-Only), Étape 2 : L'Arbitrage (La Source de Vérité), Étape 3 : La Propagation & Validation

### Community 94 - "AuthModule"
Cohesion: 0.38
Nodes (3): getAuthConfig(), JwtStrategy, Injectable

### Community 102 - "auth-session.dto.ts"
Cohesion: 0.60
Nodes (3): ApiPaginatedResponse(), PaginatedResponseDto, ApiProperty

### Community 103 - "ReplaceClientFiscalCardDto"
Cohesion: 0.67
Nodes (3): ProductionPlanningResponseDto, ProductionPlanningRowDto, ApiProperty

### Community 104 - "document-reference.module.ts"
Cohesion: 0.50
Nodes (3): ProductionStepResponseDto, ApiProperty, ApiPropertyOptional

### Community 106 - ".findAll"
Cohesion: 0.22
Nodes (9): FinancialOverviewQueryDto, ApiPropertyOptional, IsDateString, IsInt, IsOptional, IsString, Max, Min (+1 more)

### Community 110 - "UploadClientFiscalCardDto"
Cohesion: 0.29
Nodes (6): Patch, ReplaceCatalogShareProductsDto, ApiProperty, ArrayMinSize, IsArray, IsString

### Community 111 - "UpsertInvoiceTemplateDto"
Cohesion: 0.29
Nodes (4): CatalogSharesModule, Module, CatalogShareWithClientAndProducts, CatalogShareWithPublicProducts

### Community 112 - "CatalogShareProductResponseDto"
Cohesion: 0.47
Nodes (4): CatalogShareProductResponseDto, ApiProperty, CatalogShareResponseDto, ApiProperty

## Knowledge Gaps
- **378 isolated node(s):** `singleQuote`, `trailingComma`, `$schema`, `collection`, `sourceRoot` (+373 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `FinancialOverviewQueryDto` to `auth.service.ts`, `search.util.ts`, `bom-items.controller.ts`, `components.controller.ts`, `ListQueryDto`, `CreateUserDto`, `DashboardService`, `colors.controller.ts`, `FinancialTrackingService`, `financial-tracking.service.ts`, `NotificationsService`, `InvoicesService`, `ReferenceLookupQueryDto`, `app.module.ts`, `AuditService`, `SuppliersController`, `ProductsService`, `CreatePurchaseOrderDto`, `suppliers.controller.ts`, `ClientsService`, `main.ts`, `PrismaService`, `.downloadDocument`, `DeliveriesService`, `ged-paths.service.ts`, `UploadClientFiscalCardDto`, `UpsertInvoiceTemplateDto`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `ListQueryDto` connect `FinancialOverviewQueryDto` to `sales-orders.service.ts`, `search.util.ts`, `production-orders.controller.ts`, `bom-items.controller.ts`, `components.controller.ts`, `ListQueryDto`, `CreateUserDto`, `colors.controller.ts`, `ProductsController`, `InvoicesController`, `clients.controller.ts`, `ClientsController`, `PurchaseOrdersController`, `invoices.service.ts`, `SuppliersController`, `DeliveriesController`, `company-settings.controller.ts`, `purchase-orders.controller.ts`, `products.controller.ts`, `suppliers.controller.ts`, `PrismaService`, `PurchaseOrdersService`, `UpsertInvoiceTemplateDto`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `JwtAuthGuard` connect `DeliveriesService` to `SuppliersController`, `auth.service.ts`, `bom-items.controller.ts`, `components.controller.ts`, `ListQueryDto`, `company-settings.controller.ts`, `PurchaseOrdersService`, `colors.controller.ts`, `purchase-orders.controller.ts`, `products.controller.ts`, `CreateUserDto`, `UpsertInvoiceTemplateDto`, `clients.controller.ts`, `financial-tracking.service.ts`, `invoices.service.ts`, `ReferenceLookupQueryDto`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `$schema` to the rest of the system?**
  _378 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059027777777777776 - nodes in this community are weakly interconnected._
- **Should `catalog-shares.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `search.util.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07033315705975675 - nodes in this community are weakly interconnected._