import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

type DocsIndexResponse = {
  root: string;
  sections: {
    name: 'architecture' | 'dashboard' | 'notifications';
    path: string;
    files: string[];
  }[];
};

@ApiTags('Documentation')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('docs-index')
  @ApiOperation({
    summary: 'Expose a centralized index of project documentation files',
  })
  @ApiOkResponse({
    description: 'Documentation index grouped by section',
  })
  getDocsIndex(): DocsIndexResponse {
    return {
      root: 'docs',
      sections: [
        {
          name: 'architecture',
          path: 'docs/architecture',
          files: ['DASHBOARD_IMPLEMENTATION.md', 'GED_MINIO_STRUCTURE.md'],
        },
        {
          name: 'dashboard',
          path: 'docs/dashboard',
          files: [
            'README.md',
            'DASHBOARD_API.md',
            'FRONTEND_INTEGRATION.md',
            'CHECKLIST.md',
          ],
        },
        {
          name: 'notifications',
          path: 'docs/notifications',
          files: [
            'README.md',
            'USAGE.md',
            'TESTING.md',
            'CLIENT.example.md',
            'INTEGRATION.guide.md',
            'DATABASE.optional.md',
            'NOTIFICATIONS_SUMMARY.md',
            'NOTIFICATIONS_CHECKLIST.md',
          ],
        },
      ],
    };
  }
}
