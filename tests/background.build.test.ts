/**
 * @jest-environment node
 */

import fs from 'fs';
import path from 'path';

describe('background.js build', () => {
  it('should not contain any import statements', () => {
    const distPath = path.resolve(__dirname, '../dist/background.js');
    
    // ファイルが存在するかチェック
    expect(fs.existsSync(distPath)).toBe(true);
    
    const content = fs.readFileSync(distPath, 'utf-8');
    
    // import構文が含まれていないことを確認
    expect(content).not.toMatch(/import\s+.*from/);
    expect(content).not.toMatch(/import\(/);
  });

  it('should be valid JavaScript without module syntax', () => {
    const distPath = path.resolve(__dirname, '../dist/background.js');
    const content = fs.readFileSync(distPath, 'utf-8');
    
    // export構文も含まれていないことを確認
    expect(content).not.toMatch(/export\s+/);
  });
}); 