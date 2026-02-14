import type { PizzIntIndicator, StatusPanel } from '@/components';
import { fetchGdeltTensions, fetchPizzIntStatus } from '@/services';

interface LoadPizzIntFlowOptions {
  pizzintIndicator: PizzIntIndicator | null;
  statusPanel: StatusPanel | null;
}

export async function loadPizzIntFlow(options: LoadPizzIntFlowOptions): Promise<void> {
  try {
    const [status, tensions] = await Promise.all([
      fetchPizzIntStatus(),
      fetchGdeltTensions(),
    ]);

    if (status.locationsMonitored === 0) {
      options.pizzintIndicator?.hide();
      options.statusPanel?.updateApi('PizzINT', { status: 'error' });
      return;
    }

    options.pizzintIndicator?.show();
    options.pizzintIndicator?.updateStatus(status);
    options.pizzintIndicator?.updateTensions(tensions);
    options.statusPanel?.updateApi('PizzINT', { status: 'ok' });
  } catch (error) {
    console.error('[App] PizzINT load failed:', error);
    options.pizzintIndicator?.hide();
    options.statusPanel?.updateApi('PizzINT', { status: 'error' });
  }
}
