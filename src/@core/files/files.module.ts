import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { FilesService } from './files.service'
import { FileValidator } from './validators/file.validator'
import { LocalStorageService } from './services/local-storage.service'

@Global()
@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB 
      },
    }),
  ],
  providers: [
    FilesService,
    FileValidator,
    {
      provide: 'STORAGE_SERVICE',
      useClass: LocalStorageService,
    },
  ],
  exports: [FilesService, FileValidator, MulterModule],
})
export class FilesModule {}
