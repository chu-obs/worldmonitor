import type { EconomicPanel, StatusPanel } from '@/components';
import { fetchFredData, fetchOilAnalytics, fetchRecentAwards } from '@/services';
import { dataFreshness } from '@/services/data-freshness';
import { getCircuitBreakerCooldownInfo } from '@/utils';

interface EconomicFlowOptions {
  economicPanel: EconomicPanel | null;
  statusPanel: StatusPanel | null;
}

export async function loadFredDataFlow(options: EconomicFlowOptions): Promise<void> {
  const cbInfo = getCircuitBreakerCooldownInfo('FRED Economic');
  if (cbInfo.onCooldown) {
    options.economicPanel?.setErrorState(
      true,
      `Temporarily unavailable (retry in ${cbInfo.remainingSeconds}s)`
    );
    options.statusPanel?.updateApi('FRED', { status: 'error' });
    return;
  }

  try {
    options.economicPanel?.setLoading(true);
    const data = await fetchFredData();

    const postInfo = getCircuitBreakerCooldownInfo('FRED Economic');
    if (postInfo.onCooldown) {
      options.economicPanel?.setErrorState(
        true,
        `Temporarily unavailable (retry in ${postInfo.remainingSeconds}s)`
      );
      options.statusPanel?.updateApi('FRED', { status: 'error' });
      return;
    }

    if (data.length === 0) {
      options.economicPanel?.setErrorState(true, 'Failed to load economic data');
      options.statusPanel?.updateApi('FRED', { status: 'error' });
      return;
    }

    options.economicPanel?.setErrorState(false);
    options.economicPanel?.update(data);
    options.statusPanel?.updateApi('FRED', { status: 'ok' });
    dataFreshness.recordUpdate('economic', data.length);
  } catch {
    options.statusPanel?.updateApi('FRED', { status: 'error' });
    options.economicPanel?.setErrorState(true, 'Failed to load data');
    options.economicPanel?.setLoading(false);
  }
}

export async function loadOilAnalyticsFlow(options: EconomicFlowOptions): Promise<void> {
  try {
    const data = await fetchOilAnalytics();
    options.economicPanel?.updateOil(data);
  } catch (error) {
    console.error('[App] Oil analytics failed:', error);
  }
}

export async function loadGovernmentSpendingFlow(options: EconomicFlowOptions): Promise<void> {
  try {
    const data = await fetchRecentAwards({ daysBack: 7, limit: 15 });
    options.economicPanel?.updateSpending(data);
  } catch (error) {
    console.error('[App] Government spending failed:', error);
  }
}
