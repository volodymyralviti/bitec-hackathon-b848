import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomError, CreateRoom, parseDto } from './classroom.dto';

@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroom: ClassroomService) {}
  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Body() input: unknown) {
    try {
      const dto = parseDto(CreateRoom, input);
      return this.classroom.create(dto.scenarioId, dto.version);
    } catch (error) {
      if (!(error instanceof ClassroomError)) throw error;
      const body = { error: { code: error.code, message: error.message } };
      if (error.code === 'ROOM_LIMIT')
        throw new ServiceUnavailableException(body);
      throw new BadRequestException(body);
    }
  }
}
