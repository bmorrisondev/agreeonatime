import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeAdEligibility } from './compute-ad-eligibility.ts';

describe('computeAdEligibility', () => {
  it('returns loading with ads hidden while fetching', () => {
    assert.deepEqual(computeAdEligibility(null, true), {
      showAds: false,
      loading: true,
    });
    assert.deepEqual(computeAdEligibility(true, true), {
      showAds: false,
      loading: true,
    });
  });

  it('hides ads when an active entitlement is present', () => {
    assert.deepEqual(computeAdEligibility(true, false), {
      showAds: false,
      loading: false,
    });
  });

  it('shows ads when no active entitlement is found', () => {
    assert.deepEqual(computeAdEligibility(false, false), {
      showAds: true,
      loading: false,
    });
    assert.deepEqual(computeAdEligibility(null, false), {
      showAds: true,
      loading: false,
    });
  });
});
