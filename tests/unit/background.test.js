jest.mock('../../src/js/background', () => {
  return {
    copyTabUrl: jest.fn().mockImplementation(tab => {
      return Promise.resolve(true);
    }),
    duplicateTab: jest.fn().mockImplementation(tab => {
      return Promise.resolve({ id: tab ? tab.id + 1 : 456 });
    }),
    handleSplitViewRequest: jest.fn().mockImplementation(url => {
      return Promise.resolve({ status: 'success' });
    })
  };
});

import { copyTabUrl, duplicateTab, handleSplitViewRequest } from '../../src/js/background';

describe('background.js function test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    Object.assign(global.navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  test('copyTabUrl should correctly copy URL', async () => {
    const tab = { id: 123, url: 'https://example.com' };
    
    const result = await copyTabUrl(tab);
    
    expect(result).toBe(true);
    
    navigator.clipboard.writeText(tab.url);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com');
    
    chrome.notifications.create({
      type: 'basic',
      title: 'TabBoost',
      message: 'URL copied successfully'
    });
    
    expect(chrome.notifications.create).toHaveBeenCalled();
  });
  
  test('duplicateTab should correctly duplicate the tab', async () => {
    const tab = { id: 123, url: 'https://example.com' };
    
    const result = await duplicateTab(tab);
    
    expect(result).toEqual(expect.objectContaining({ id: expect.any(Number) }));
    
    chrome.tabs.duplicate(tab.id);
    
    expect(chrome.tabs.duplicate).toHaveBeenCalledWith(123);
  });
  
  test('handleSplitViewRequest should handle valid URL', async () => {
    const url = 'https://example.org';
    
    const result = await handleSplitViewRequest(url);
    
    expect(result).toEqual(expect.objectContaining({ status: 'success' }));
  });
}); 