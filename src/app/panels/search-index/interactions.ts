import { SearchModal, type SearchResult } from '@/components/SearchModal';

interface WireSearchModalInteractionsOptions {
  searchModal: SearchModal;
  onSelect: (result: SearchResult) => void;
  updateSearchIndex: () => void;
}

export function wireSearchModalInteractions(
  options: WireSearchModalInteractionsOptions
): (event: KeyboardEvent) => void {
  options.searchModal.setOnSelect(options.onSelect);

  const keydownHandler = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (options.searchModal.isOpen()) {
        options.searchModal.close();
      } else {
        options.updateSearchIndex();
        options.searchModal.open();
      }
    }
  };

  document.addEventListener('keydown', keydownHandler);
  return keydownHandler;
}
