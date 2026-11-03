import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClinicsModule } from './clinics/clinics.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { PlansModule } from './plans/plans.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { ClinicalModule } from './clinical/clinical.module.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { PrescriptionsModule } from './prescriptions/prescriptions.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClinicsModule,
    PatientsModule,
    AppointmentsModule,
    PlansModule,
    SubscriptionsModule,
    ClinicalModule,
    EnquiriesModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
