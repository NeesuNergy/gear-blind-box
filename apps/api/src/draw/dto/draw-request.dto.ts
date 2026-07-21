import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * POST /api/v1/draw 请求体校验规则,对应 docs/03-spec/API-SPEC.md 3.2 节。
 */
export class DrawRequestDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number;
}
