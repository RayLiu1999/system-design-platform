import React from 'react';
import './FormattedContent.css';

/**
 * 格式化內容組件
 * 處理文本中的列表 (1), (2), (3) 以及換行符與內聯代碼
 */
const FormattedContent = ({ text }) => {
  if (!text) return null;

  // 1. 處理換行符，先將文本按段落切分
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="formatted-content">
      {paragraphs.map((para, pIdx) => {
        // 2. 檢測是否存在 (1), (2) 列表模式
        const listPattern = /(\(\d\)\s?[^()]+)/g;
        const listMatches = para.match(listPattern);

        if (listMatches && listMatches.length > 1) {
          // 提取列表前的引言文本
          const introText = para.split('(')[0];
          // 提取列表後的結論文本 (如果有)
          const lastMatch = listMatches[listMatches.length - 1];
          const outroText = para.split(lastMatch)[1];

          return (
            <div key={pIdx} className="content-paragraph">
              {introText && <p className="content-intro">{formatInline(introText)}</p>}
              <ul className="content-list">
                {listMatches.map((item, iIdx) => (
                  <li key={iIdx} className="content-list-item">
                    {formatInline(item)}
                  </li>
                ))}
              </ul>
              {outroText && outroText.trim() && <p className="content-outro">{formatInline(outroText)}</p>}
            </div>
          );
        }

        // 3. 普通段落
        return (
          <p key={pIdx} className="content-text">
            {formatInline(para)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * 格式化內聯元素 (如 `代碼` 或 『強烈建議』)
 */
function formatInline(text) {
  // 處理反引號程式碼 `code`
  const parts = text.split(/(`[^`]+`)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    }
    
    // 處理重點符號 『重點』
    const emphasisParts = part.split(/(『[^』]+』)/g);
    return emphasisParts.map((ePart, j) => {
      if (ePart.startsWith('『') && ePart.endsWith('』')) {
        return <span key={`${i}-${j}`} className="emphasis-text">{ePart}</span>;
      }
      return ePart;
    });
  });
}

export default FormattedContent;
