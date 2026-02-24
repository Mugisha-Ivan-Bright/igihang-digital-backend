import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA_TOKEN',// We name it explicitly to avoid confusion with the class name
      useClass: PrismaService,
    }
  ],
  exports: ['PRISMA_TOKEN'], // Export the token, not the class
})
export class PrismaModule {}
