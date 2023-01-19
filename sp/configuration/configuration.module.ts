import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./configuration";
import * as Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [configuration],
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("local", "test", "develop", "staging", "production")
          .default("local"),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class EnvConfigModule {}
