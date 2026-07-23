import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CombinationItemResult, DrawResult, ScoreRange } from '@gearblindbox/shared-types';
import type { GearItem } from '@gearblindbox/shared-types';
import { drawCombination } from '@gearblindbox/scoring-engine';
import { ApiBusinessException } from '../common/filters/http-exception.filter';
import { GearConfigService } from '../gear-config/gear-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { DrawRequestDto } from './dto/draw-request.dto';

function toCombinationItemResult(item: GearItem): CombinationItemResult {
  return { id: item.id, name: item.name, score: item.baseScore };
}

/**
 * 抽取业务流程编排,按 docs/02-architecture/ARCHITECTURE.md 第 5 节的数据流:
 * 1. 校验评分区间合法性(minScore ≤ maxScore)
 * 2. 读取当前生效配置(GearConfigService,V0.1 无 Redis 缓存,直接查库)
 * 3. 调用 @gearblindbox/scoring-engine 的 drawCombination 计算结果
 * 4. 落库 DrawRecord(含配置版本快照,见 DATA-MODEL.md 3.1 节)
 * 5. 返回结果给 controller
 */
@Injectable()
export class DrawService {
  constructor(
    private readonly gearConfigService: GearConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async draw(dto: DrawRequestDto, anonymousId: string): Promise<DrawResult> {
    this.assertValidRange(dto);

    const { pools, weights, versionTag } = await this.gearConfigService.getEffectivePool();
    const range = this.toScoreRange(dto);
    const outcome = drawCombination(pools, weights, range);

    if (!outcome.feasible) {
      throw new ApiBusinessException(
        'SCORE_RANGE_INFEASIBLE',
        '当前设定的评分区间在现有配置下无法达成,请调整区间后重试',
        HttpStatus.OK,
      );
    }

    // feasible: true 时 scoring-engine 保证 items/totalScore 一定存在。
    const items = outcome.items as Record<'weapon' | 'helmet' | 'armor' | 'operator', GearItem>;
    const totalScore = outcome.totalScore as number;
    const usedFallback = outcome.usedFallback ?? false;

    await this.prisma.drawRecord.create({
      data: {
        anonymousId,
        sessionId: dto.sessionId,
        configVersion: versionTag,
        weaponItem: items.weapon as unknown as Prisma.InputJsonValue,
        helmetItem: items.helmet as unknown as Prisma.InputJsonValue,
        armorItem: items.armor as unknown as Prisma.InputJsonValue,
        operatorItem: items.operator as unknown as Prisma.InputJsonValue,
        weaponScore: items.weapon.baseScore,
        helmetScore: items.helmet.baseScore,
        armorScore: items.armor.baseScore,
        operatorScore: items.operator.baseScore,
        totalScore,
        selectedMinScore: dto.minScore ?? null,
        selectedMaxScore: dto.maxScore ?? null,
      },
    });

    return {
      combination: {
        weapon: toCombinationItemResult(items.weapon),
        helmet: toCombinationItemResult(items.helmet),
        armor: toCombinationItemResult(items.armor),
        operator: toCombinationItemResult(items.operator),
      },
      totalScore,
      configVersion: versionTag,
      usedFallback,
    };
  }

  /** 见 docs/03-spec/API-SPEC.md 3.2 节错误码:INVALID_SCORE_RANGE。 */
  private assertValidRange(dto: DrawRequestDto): void {
    if (dto.minScore !== undefined && dto.maxScore !== undefined && dto.minScore > dto.maxScore) {
      throw new ApiBusinessException(
        'INVALID_SCORE_RANGE',
        'minScore 不能大于 maxScore',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** 未设定任何区间时返回 undefined,交由 scoring-engine 走全区间加权随机路径。 */
  private toScoreRange(dto: DrawRequestDto): ScoreRange | undefined {
    if (dto.minScore === undefined && dto.maxScore === undefined) {
      return undefined;
    }
    return { minScore: dto.minScore, maxScore: dto.maxScore };
  }
}
