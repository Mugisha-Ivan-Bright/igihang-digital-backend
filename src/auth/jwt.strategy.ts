import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => {
                    let token = null;
                    if (req && req.cookies) {
                        token = req.cookies['access_token'];
                    }
                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'SECRET_KEY',
        });
    }

    async validate(payload: any) {
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
