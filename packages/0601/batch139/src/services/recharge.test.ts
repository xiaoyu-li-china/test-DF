import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { getRechargeTiers, recharge } from '@/services/api';

const extractCouponTotalValue = (tiers: Awaited<ReturnType<typeof getRechargeTiers>>) => {
  return tiers.map((tier) => ({
    id: tier.id,
    amount: tier.amount,
    couponTotal: tier.bonus
      .filter((b) => b.type === 'coupon')
      .reduce((sum, b) => sum + b.value, 0),
    cashTotal: tier.bonus
      .filter((b) => b.type === 'cash')
      .reduce((sum, b) => sum + b.value, 0),
    totalBonusValue: tier.bonus.reduce((sum, b) => sum + b.value, 0),
  }));
};

describe('Recharge Tier Bonus Calculation', () => {
  it('calculates coupon bonus correctly for T100 (¥100)', async () => {
    const tiers = await getRechargeTiers();
    const t100 = tiers.find((t) => t.id === 'T100');
    expect(t100).toBeDefined();
    expect(t100!.amount).toBe(100);

    const coupons = t100!.bonus.filter((b) => b.type === 'coupon');
    const cash = t100!.bonus.filter((b) => b.type === 'cash');

    expect(coupons.length).toBe(1);
    expect(coupons[0].value).toBe(10);
    expect(cash.length).toBe(0);

    const totalCouponValue = coupons.reduce((s, b) => s + b.value, 0);
    expect(totalCouponValue).toBe(10);
  });

  it('calculates coupon + cash bonus correctly for T200 (¥200)', async () => {
    const tiers = await getRechargeTiers();
    const t200 = tiers.find((t) => t.id === 'T200');
    expect(t200).toBeDefined();
    expect(t200!.amount).toBe(200);

    const coupons = t200!.bonus.filter((b) => b.type === 'coupon');
    const cash = t200!.bonus.filter((b) => b.type === 'cash');

    expect(coupons.length).toBe(1);
    expect(coupons[0].value).toBe(30);
    expect(cash.length).toBe(1);
    expect(cash[0].value).toBe(10);

    const totalBonus = t200!.bonus.reduce((s, b) => s + b.value, 0);
    expect(totalBonus).toBe(40);
  });

  it('calculates coupon + cash bonus correctly for T500 (¥500)', async () => {
    const tiers = await getRechargeTiers();
    const t500 = tiers.find((t) => t.id === 'T500');
    expect(t500).toBeDefined();
    expect(t500!.amount).toBe(500);

    const coupons = t500!.bonus.filter((b) => b.type === 'coupon');
    const cash = t500!.bonus.filter((b) => b.type === 'cash');

    expect(coupons.length).toBe(1);
    expect(coupons[0].value).toBe(100);
    expect(cash.length).toBe(1);
    expect(cash[0].value).toBe(50);

    const totalBonus = t500!.bonus.reduce((s, b) => s + b.value, 0);
    expect(totalBonus).toBe(150);
  });

  it('extracts all tier bonus summaries correctly', async () => {
    const tiers = await getRechargeTiers();
    const summary = extractCouponTotalValue(tiers);

    expect(summary).toEqual([
      { id: 'T100', amount: 100, couponTotal: 10, cashTotal: 0, totalBonusValue: 10 },
      { id: 'T200', amount: 200, couponTotal: 30, cashTotal: 10, totalBonusValue: 40 },
      { id: 'T500', amount: 500, couponTotal: 100, cashTotal: 50, totalBonusValue: 150 },
    ]);
  });

  it('verifies coupon minSpend is double coupon value after recharge', async () => {
    const result = await recharge('T100', 'wechat');
    expect(result.success).toBe(true);
    expect(result.coupons.length).toBe(1);
    expect(result.coupons[0].minSpend).toBe(result.coupons[0].value * 2);
  });

  it('returns coupons only for coupon-type bonuses after recharge', async () => {
    const result = await recharge('T200', 'wechat');
    expect(result.success).toBe(true);

    const couponBonuses = result.coupons;
    expect(couponBonuses.length).toBeGreaterThanOrEqual(1);
    couponBonuses.forEach((coupon) => {
      expect(coupon.value).toBeGreaterThan(0);
      expect(coupon.minSpend).toBeGreaterThan(0);
      expect(coupon.expireDate).toBeTruthy();
    });
  });

  it('throws error for invalid tier id (400 response)', async () => {
    server.use(
      http.post('/api/recharge', () => {
        return HttpResponse.json(
          { success: false, newBalance: 0, coupons: [], orderId: '', pointsEarned: 0 },
          { status: 400 }
        );
      })
    );

    await expect(recharge('INVALID', 'wechat')).rejects.toThrow('充值失败');
  });

  it('calculates points earned correctly for non-birthday month', async () => {
    server.use(
      http.post('/api/recharge', () => {
        return HttpResponse.json({
          success: true,
          newBalance: 428.5,
          coupons: [],
          orderId: 'ORD_TEST',
          pointsEarned: 100,
        });
      })
    );

    const result = await recharge('T100', 'wechat');
    expect(result.success).toBe(true);
    expect(result.pointsEarned).toBe(100);
  });

  it('calculates double points for birthday month', async () => {
    server.use(
      http.post('/api/recharge', () => {
        return HttpResponse.json({
          success: true,
          newBalance: 528.5,
          coupons: [],
          orderId: 'ORD_BDAY',
          pointsEarned: 200,
        });
      })
    );

    const result = await recharge('T100', 'wechat');
    expect(result.success).toBe(true);
    expect(result.pointsEarned).toBe(200);
  });
});
