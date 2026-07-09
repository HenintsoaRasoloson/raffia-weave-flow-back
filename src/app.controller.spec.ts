import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('docs-index', () => {
    it('should expose centralized documentation sections', () => {
      const response = appController.getDocsIndex();

      expect(response.root).toBe('docs');
      expect(response.sections).toHaveLength(3);
      expect(response.sections.map((section) => section.name)).toEqual([
        'architecture',
        'dashboard',
        'notifications',
      ]);
      expect(response.sections[0].files).toContain('GED_MINIO_STRUCTURE.md');
      expect(response.sections[2].files).toContain(
        'NOTIFICATIONS_CHECKLIST.md',
      );
    });
  });
});
