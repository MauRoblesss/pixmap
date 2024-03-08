/*
 * Renders Markdown that got parsed by core/MarkdownParser
 */
import React from 'react';

import MdLink from '../../src/components/MdLink';
import MdMention from './MdMention';

export const MarkdownParagraph = React.memo(({ pArray }) => pArray.map((part) => {
  if (!Array.isArray(part)) {
    return part;
  }
  const type = part[0];
  switch (type) {
    case 'c':
      return (<code>{part[1]}</code>);
    case '*':
      return (
        <strong>
          <MarkdownParagraph pArray={part[1]} />
        </strong>
      );
    case '~':
      return (
        <s>
          <MarkdownParagraph pArray={part[1]} />
        </s>
      );
    case '+':
      return (
        <em>
          <MarkdownParagraph pArray={part[1]} />
        </em>
      );
    case '_':
      return (
        <u>
          <MarkdownParagraph pArray={part[1]} />
        </u>
      );
    case 'img':
    case 'l': {
      return (
        <MdLink href={part[2]} title={part[1]} />
      );
    }
    case '@': {
      return (
        <MdMention uid={part[2]} name={part[1]} />
      );
    }
    default:
      return type;
  }
}));

const Markdown = ({ mdArray }) => mdArray.map((part) => {
  const type = part[0];
  switch (type) {
    /* Heading */
    case 'a': {
      const level = Number(part[1]);
      const heading = part[2];
      const children = part[3];
      let headingElem = [];
      switch (level) {
        case 1:
          headingElem = <h1>{heading}</h1>;
          break;
        case 2:
          headingElem = <h2>{heading}</h2>;
          break;
        case 3:
          headingElem = <h3>{heading}</h3>;
          break;
        default:
          headingElem = <h4>{heading}</h4>;
      }
      return [
        headingElem,
        <section>
          <Markdown mdArray={children} />
        </section>,
      ];
    }
    /* Paragraph */
    case 'p': {
      return (
        <p>
          <MarkdownParagraph pArray={part[1]} />
        </p>
      );
    }
    /* Code Block */
    case 'cb': {
      const content = part[1];
      return <pre>{content}</pre>;
    }
    case '>':
    case '<': {
      const children = part[1];
      return (
        <blockquote
          className={(type === '>') ? 'gt' : 'rt'}
        >
          <Markdown mdArray={children} />
        </blockquote>
      );
    }
    case 'ul': {
      const children = part[1];
      return (
        <ul>
          <Markdown mdArray={children} />
        </ul>
      );
    }
    case 'ol': {
      const children = part[1];
      return (
        <ol>
          <Markdown mdArray={children} />
        </ol>
      );
    }
    case '-': {
      const children = part[1];
      return (
        <li>
          <Markdown mdArray={children} />
        </li>
      );
    }
    default:
      return part[0];
  }
});

const MarkdownArticle = ({ mdArray }) => (
  <article>
    <Markdown mdArray={mdArray} />
  </article>
);

export default React.memo(MarkdownArticle);
