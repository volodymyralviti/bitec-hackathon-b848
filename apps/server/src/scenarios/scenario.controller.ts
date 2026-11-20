import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScenarioService } from './scenario.service';
import { AuthorGuard, ReviewerGuard } from './access.guard';

@Controller('scenarios')
export class PublicScenarioController {
  constructor(private readonly service: ScenarioService) {}
  @Get() catalog() {
    return this.service.catalog();
  }
  @Get(':id') get(@Param('id') id: string, @Query('version') version?: string) {
    return this.service.publicGet(id, version);
  }
}

@Controller('author/scenarios')
@UseGuards(AuthorGuard)
export class AuthorScenarioController {
  constructor(private readonly service: ScenarioService) {}
  @Get() list() {
    return this.service.list();
  }
  @Post('validate') validate(@Body() body: unknown) {
    return this.service.validate(body);
  }
  @Post('import') import(@Body() body: unknown) {
    return this.service.create(body);
  }
  @Post() create(@Body() body: unknown) {
    return this.service.create(body);
  }
  @Get(':id/:version') get(
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.service.get(id, version);
  }
  @Get(':id/:version/export')
  @Header('Content-Type', 'application/json; charset=utf-8')
  export(@Param('id') id: string, @Param('version') version: string) {
    return this.service.get(id, version).scenario;
  }
  @Put(':id/:version') update(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: unknown,
  ) {
    return this.service.update(id, version, body);
  }
  @Post(':id/:version/fork') fork(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: unknown,
  ) {
    return this.service.fork(id, version, body);
  }
  @Post(':id/:version/demo') demo(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: unknown,
  ) {
    return this.service.demo(id, version, body);
  }
}

@Controller('reviewer/scenarios')
@UseGuards(ReviewerGuard)
export class ReviewerScenarioController {
  constructor(private readonly service: ScenarioService) {}
  @Post(':id/:version/review') review(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: unknown,
  ) {
    return this.service.review(id, version, body);
  }
  @Post(':id/:version/publish') publish(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: unknown,
  ) {
    return this.service.publish(id, version, body);
  }
}
