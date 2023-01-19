import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from 'src/config/configuration.d';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService<EnvironmentVariables>,
  ) {}
  async validateUser(email: string, pass: string): Promise<any> {
    const env = this.configService.get('env');
    return ['production', 'staging'].indexOf(env) === -1 ? true : null;
  }
  async login(user: any) {
    return {
      access_token: this.jwtService.sign({ key: 'splitamerge' }),
    };
  }
}
