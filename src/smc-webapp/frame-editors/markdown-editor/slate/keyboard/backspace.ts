/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

/*
What happens when you hit the backspace/delete key.

  - deleting (certain?) void elements. See
     https://github.com/ianstormtaylor/slate/issues/3875
    for discussion of why we must implement this ourselves.
*/

import { Editor, Point, Range } from "slate";
import { register } from "./register";

function backspaceKey({ editor }) {
  if (editor.selection == null || !Range.isCollapsed(editor.selection)) {
    // default handler
    return false;
  }

  // In slatejs you can't delete various block elements at the beginning of the
  // document. This is yet another **BUG IN SLATE**, which we workaround by
  // inserting an empty node at the beginning of the document.  This does not
  // seem to be reported upstream, and I'm not even bothering since there's
  // so many bugs like this we have to workaround.   Morever, if this bug is
  // fixed upstream, it breaks our workaround!  Sigh.
  if (isAtStart(editor.selection.focus)) {
    editor.apply({
      type: "insert_node",
      path: [0],
      node: { type: "paragraph", children: [{ text: "" }] },
    });
    Editor.deleteBackward(editor);
  }

  // This seems to work perfectly in all cases, including working around the
  // void delete bug in Slate:
  //     https://github.com/ianstormtaylor/slate/issues/3875

  Editor.deleteBackward(editor);
  return true;
}

register([{ key: "Backspace" }, { key: "Delete" }], backspaceKey);

function isAtStart(loc: Point): boolean {
  for (const n of loc.path) {
    if (n != 0) return false;
  }
  return loc.offset == 0;
}
