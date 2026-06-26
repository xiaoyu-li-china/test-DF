import '@testing-library/jest-dom/vitest';

if (!document.execCommand) {
  (document as unknown as { execCommand: () => boolean }).execCommand = () => true;
}

if (!document.queryCommandState) {
  (document as unknown as { queryCommandState: () => boolean }).queryCommandState = () => false;
}

if (!document.queryCommandEnabled) {
  (document as unknown as { queryCommandEnabled: () => boolean }).queryCommandEnabled = () => true;
}
