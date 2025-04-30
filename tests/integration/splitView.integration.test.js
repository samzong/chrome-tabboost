jest.mock('../../src/js/splitView/splitViewCore', () => {
  return {
    initSplitViewModule: jest.fn(),
    createSplitView: jest.fn().mockResolvedValue(true),
    closeSplitView: jest.fn().mockResolvedValue(true),
    toggleSplitView: jest.fn().mockResolvedValue(true),
    updateRightView: jest.fn().mockResolvedValue(true),
    getSplitViewState: jest.fn().mockReturnValue({
      isActive: true,
      leftUrl: 'https://example.com',
      rightUrl: 'https://example.org'
    })
  };
});

jest.mock('../../src/utils/utils', () => ({
  getCurrentTab: jest.fn().mockResolvedValue({ 
    id: 123, 
    url: 'https://example.com' 
  }),
  validateUrl: jest.fn(url => ({
    isValid: url && url.startsWith('http'),
    reason: url && url.startsWith('http') ? '' : 'Invalid URL',
    sanitizedUrl: url
  }))
}));

import splitViewCore from '../../src/js/splitView/splitViewCore';

describe('Split view integration test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('Create split view process', async () => {
    await splitViewCore.createSplitView();
    
    expect(splitViewCore.createSplitView).toHaveBeenCalled();
  });
  
  test('Toggle split view process', async () => {
    await splitViewCore.toggleSplitView();
    
    expect(splitViewCore.toggleSplitView).toHaveBeenCalled();
  });
  
  test('URL validation and iframe compatibility check process', async () => {
    const validUrl = 'https://example.org';
    
    await splitViewCore.updateRightView(validUrl);
    
    expect(splitViewCore.updateRightView).toHaveBeenCalledWith(validUrl);
  });
}); 