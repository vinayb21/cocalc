import * as React from "react";
import { useRef } from "react";
import { Range, Element, Text as SlateText } from "slate";

import Leaf from "./leaf";
import { ReactEditor, useSlateStatic } from "..";
import { RenderLeafProps } from "./editable";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import {
  KEY_TO_ELEMENT,
  NODE_TO_ELEMENT,
  ELEMENT_TO_NODE,
} from "../utils/weak-maps";

/**
 * Text.
 */

const Text = (props: {
  decorations: Range[];
  isLast: boolean;
  parent: Element;
  renderLeaf?: React.FC<RenderLeafProps>;
  text: SlateText;
}) => {
  const { decorations, isLast, parent, renderLeaf, text } = props;
  const editor = useSlateStatic();
  const ref = useRef<HTMLSpanElement>(null);
  const leaves = SlateText.decorations(text, decorations);
  const key = ReactEditor.findKey(editor, text);
  const children: JSX.Element[] = [];

  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];

    children.push(
      <Leaf
        isLast={isLast && i === leaves.length - 1}
        key={`${key.id}-${i}`}
        leaf={leaf}
        text={text}
        parent={parent}
        renderLeaf={renderLeaf}
      />
    );
  }

  // Update element-related weak maps with the DOM element ref.
  useIsomorphicLayoutEffect(() => {
    if (ref.current) {
      KEY_TO_ELEMENT.set(key, ref.current);
      NODE_TO_ELEMENT.set(text, ref.current);
      ELEMENT_TO_NODE.set(ref.current, text);
    } else {
      KEY_TO_ELEMENT.delete(key);
      NODE_TO_ELEMENT.delete(text);
    }
  });

  return (
    <span data-slate-node="text" ref={ref}>
      {children}
    </span>
  );
};

const MemoizedText = React.memo(Text, (prev, next) => {
  // I think including parent is wrong here. E.g.,
  // parent is not included in the analogous function
  // in element.tsx. See my comment here:
  // https://github.com/ianstormtaylor/slate/issues/4056#issuecomment-768059323

  const is_equal =
    /* next.parent === prev.parent && */
    next.renderLeaf === prev.renderLeaf &&
    next.isLast === prev.isLast &&
    next.text === prev.text;
  return is_equal;
});

export default MemoizedText;
