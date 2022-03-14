import { RegexUtils } from './RegexUtils';

describe('ParseHTML', () => {
  const snippetWithViewBox = `<svg viewBox="0 0 207 209.9">
	<path d="M119.1,62.2c1-2.3,2.2-4.5,3.6-6.6c0.7-1,1.4-1.7,2.1-2.7c-0.4,0-0.7,0.1-1,0.3c-0.7,0.5-1,1.3-1.5,1.7"/>
    </svg>`;
  const snippetWithoutViewBox =
    '<svg><path d="M119.1,62.2c1-2.3,2.2-4.5,3.6-6.6c0.7-1,1.4-1.7,2.1-2.7c-0.4"/></svg>';
  const bigSnippet = `<div>
        <p>some text</p>
        <svg viewBox="0 0 207 209.9">
            <path d="M119.1,62.2c1-2.3"/>
        </svg>
    </div>`;

  it('extracts an svg component', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithViewBox);
    expect(svgComponent).toBeDefined();
    expect(svgComponent?.type).toBe('svg');
  });

  it('extracts an svg component from a block of html', () => {
    const svgComponent = RegexUtils.extractSvg(bigSnippet);
    expect(svgComponent?.type).toBe('svg');
  });

  it('extracts an svg component and retains viewBox', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithViewBox);
    expect(svgComponent?.props?.viewBox).toBe('0 0 207 209.9');
  });

  it('extracts an svg component without viewBox', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithoutViewBox);
    expect(svgComponent?.type).toBe('svg');
  });

  it('applies the supplied style', () => {
    const style = { width: 100 };
    const svgComponent = RegexUtils.extractSvg(snippetWithoutViewBox, style);
    expect(svgComponent?.props?.style).toBe(style);
  });
});
