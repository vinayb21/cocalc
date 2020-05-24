/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// standard non-CoCalc libraries
import * as immutable from "immutable";
import { debounce } from "lodash";
import { useDebounce } from "use-debounce";
const { IS_MOBILE } = require("../feature");

// CoCalc libraries
import { smiley, history_path, emoticons, path_split } from "smc-util/misc";
const { sanitize_html_safe } = require("../misc_page");
import { DISCORD_INVITE } from "smc-util/theme";
import { SaveButton } from "../frame-editors/frame-tree/save-button";

// have to rewrite buttons like SaveButton in antd before we can
// switch to antd buttons.
import { Button, ButtonGroup } from "react-bootstrap";

import { ChatInput } from "./input";
import {
  mark_chat_as_read_if_unseen,
  scroll_to_bottom,
  INPUT_HEIGHT,
} from "./utils";

import {
  React,
  redux,
  useActions,
  useEffect,
  useRef,
  useRedux,
  useMemo,
} from "../app-framework";
import { Icon, Loading, Tip, SearchInput, A } from "../r_misc";
import { Col, Row, Well } from "../antd-bootstrap";
import { ChatLog } from "./chat-log";
import { WindowedList } from "../r_misc/windowed-list";

import { VideoChatButton } from "./video/launch-button";
import { Markdown } from "./markdown";
import { TIP_TEXT } from "../widget-markdown-input/main";

const PREVIEW_STYLE: React.CSSProperties = {
  background: "#f5f5f5",
  fontSize: "14px",
  borderRadius: "10px 10px 10px 10px",
  boxShadow: "#666 3px 3px 3px",
  paddingBottom: "20px",
  maxHeight: "40vh",
  overflowY: "auto",
};

const GRID_STYLE: React.CSSProperties = {
  maxWidth: "1200px",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  margin: "auto",
};

const CHAT_LOG_STYLE: React.CSSProperties = {
  margin: "0",
  padding: "0",
  background: "white",
  flex: "1 0 auto",
  position: "relative",
};

interface Props {
  project_id: string;
  path: string;
}

export const ChatRoom: React.FC<Props> = ({ project_id, path }) => {
  const actions = useActions(project_id, path);
  const font_size = useRedux(["account", "font_size"]);
  const account_id = useRedux(["account", "account_id"]);
  const other_settings = useRedux(["account", "other_settings"]);

  const is_uploading = useRedux(["is_uploading"], project_id, path);
  const is_saving = useRedux(["is_saving"], project_id, path);
  const is_preview = useRedux(["is_preview"], project_id, path);
  const has_unsaved_changes = useRedux(
    ["has_unsaved_changes"],
    project_id,
    path
  );
  const has_uncommitted_changes = useRedux(
    ["has_uncommitted_changes"],
    project_id,
    path
  );
  const input: string = useRedux(["input"], project_id, path);
  const [preview] = useDebounce(input, 250);

  const search = useRedux(["search"], project_id, path);
  const saved_mesg = useRedux(["saved_mesg"], project_id, path);
  const messages = useRedux(["messages"], project_id, path);

  const input_ref = useRef<HTMLTextAreaElement>(null);
  const log_container_ref = useRef<WindowedList>(null);

  const project_map = useRedux(["projects", "project_map"]);
  const project_users = useMemo(() => {
    // the immutable.Map() default is because of admins:
    // https://github.com/sagemathinc/cocalc/issues/3669
    return project_map.getIn([project_id, "users"], immutable.Map());
  }, [project_map]);
  const enable_mentions = useMemo(
    () => project_users.size > 1 && other_settings.get("allow_mentions"),
    [project_users, other_settings]
  );

  const user_map = useRedux(["users", "user_map"]);

  useEffect(() => {
    scroll_to_bottom(log_container_ref);
  }, [messages]);

  // The act of opening/displaying the chat marks it as seen...
  useEffect(() => {
    mark_as_read();
  }, []);

  function mark_as_read() {
    mark_chat_as_read_if_unseen(project_id, path);
  }

  function on_send_button_click(e): void {
    e.preventDefault();
    on_send();
  }

  function button_scroll_to_bottom(): void {
    scroll_to_bottom(log_container_ref, true);
  }

  function show_timetravel(): void {
    redux.getProjectActions(project_id).open_file({
      path: history_path(path),
      foreground: true,
      foreground_project: true,
    });
  }

  function render_mention_email(): JSX.Element {
    if (redux.getStore("projects").has_internet_access(project_id)) {
      return <span>(they may receive an email)</span>;
    } else {
      return <span>(enable the Internet Access upgrade to send emails)</span>;
    }
  }

  // All render methods
  function render_bottom_tip(): JSX.Element {
    const tip = (
      <span>
        {TIP_TEXT} Press Shift+Enter to send your chat. Double click to edit
        past chats.
      </span>
    );

    return (
      <Tip title="Use Markdown" tip={tip} delayShow={2500}>
        <div
          style={{ color: "#767676", fontSize: "12.5px", marginBottom: "5px" }}
        >
          Shift+Enter to send your message. Use @name to mention a collaborator
          on this project {render_mention_email()}. Double click chat bubbles to
          edit them. Format using{" "}
          <a
            href="https://help.github.com/articles/getting-started-with-writing-and-formatting-on-github/"
            target="_blank"
          >
            Markdown
          </a>{" "}
          and{" "}
          <a
            href="https://en.wikibooks.org/wiki/LaTeX/Mathematics"
            target="_blank"
          >
            LaTeX
          </a>
          . Emoticons: {emoticons}. Chat outside CoCalc{" "}
          <A href={DISCORD_INVITE}>on Discord</A>.
        </div>
      </Tip>
    );
  }

  function render_preview_message(): JSX.Element | undefined {
    if (input.length == 0 || preview.length == 0) return;
    const value = sanitize_html_safe(
      smiley({
        s: preview,
        wrap: ['<span class="smc-editor-chat-smiley">', "</span>"],
      })
    );
    const file_path = path != null ? path_split(path).head : undefined;

    return (
      <Row style={{ position: "absolute", bottom: "0px", width: "100%" }}>
        <Col xs={0} sm={2} />

        <Col xs={10} sm={9}>
          <Well style={PREVIEW_STYLE}>
            <div
              className="pull-right lighten"
              style={{
                marginRight: "-8px",
                marginTop: "-10px",
                cursor: "pointer",
                fontSize: "13pt",
              }}
              onClick={() => actions.set_is_preview(false)}
            >
              <Icon name="times" />
            </div>
            <Markdown
              value={value}
              project_id={project_id}
              file_path={file_path}
            />
            <div className="small lighten" style={{ marginTop: "15px" }}>
              Preview (press Shift+Enter to send)
            </div>
          </Well>
        </Col>

        <Col sm={1} />
      </Row>
    );
  }

  function render_timetravel_button(): JSX.Element {
    return (
      <Button onClick={show_timetravel} bsStyle="info">
        <Tip
          title="TimeTravel"
          tip={<span>Browse all versions of this chatroom.</span>}
          placement="left"
        >
          <Icon name="history" /> TimeTravel
        </Tip>
      </Button>
    );
  }

  function render_bottom_button(): JSX.Element {
    return (
      <Button onClick={button_scroll_to_bottom}>
        <Tip
          title="Scroll to Bottom"
          tip={<span>Scrolls the chat to the bottom</span>}
          placement="left"
        >
          <Icon name="arrow-down" /> Bottom
        </Tip>
      </Button>
    );
  }

  function render_save_button() {
    return (
      <SaveButton
        onClick={() => actions.save_to_disk()}
        is_saving={is_saving}
        has_unsaved_changes={has_unsaved_changes}
        has_uncommitted_changes={has_uncommitted_changes}
      />
    );
  }

  function render_video_chat_button() {
    if (project_id == null || path == null) return;
    return (
      <VideoChatButton
        project_id={project_id}
        path={path}
        button={true}
        label={"Video Chat"}
      />
    );
  }

  function render_search() {
    return (
      <SearchInput
        placeholder={"Find messages..."}
        default_value={search}
        on_change={debounce(
          (value) => actions.setState({ search: value }),
          250
        )}
        style={{ margin: 0, width: "100%", marginBottom: "5px" }}
      />
    );
  }

  function render_button_row() {
    return (
      <Row style={{ marginTop: "5px" }}>
        <Col xs={6} md={6} style={{ padding: "2px", textAlign: "right" }}>
          <ButtonGroup>
            {render_save_button()}
            {render_timetravel_button()}
            {render_video_chat_button()}
            {render_bottom_button()}
          </ButtonGroup>
        </Col>
        <Col xs={6} md={6} style={{ padding: "2px" }}>
          {render_search()}
        </Col>
      </Row>
    );
  }

  function on_send(): void {
    scroll_to_bottom(log_container_ref, true);
    actions.send_chat();
    input_ref.current?.focus?.();
  }

  function on_clear(): void {
    actions.set_input("");
  }

  function render_body(): JSX.Element {
    return (
      <div className="smc-vfill" style={GRID_STYLE}>
        {!IS_MOBILE ? render_button_row() : undefined}
        <div className="smc-vfill" style={CHAT_LOG_STYLE}>
          <ChatLog
            windowed_list_ref={log_container_ref}
            messages={messages}
            account_id={account_id}
            user_map={user_map}
            project_id={project_id}
            font_size={font_size}
            file_path={path != null ? path_split(path).head : undefined}
            actions={actions}
            saved_mesg={saved_mesg}
            search={search}
            show_heads={true}
          />
          {is_preview && render_preview_message()}
        </div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              flex: "1",
              padding: "0px 5px 0px 2px",
            }}
          >
            <ChatInput
              project_id={project_id}
              path={path}
              input={input}
              input_ref={input_ref}
              enable_mentions={enable_mentions}
              project_users={project_users}
              user_store={redux.getStore("users")}
              on_clear={on_clear}
              on_send={on_send}
              on_set_to_last_input={() => actions.set_to_last_input()}
              account_id={account_id}
              height={INPUT_HEIGHT}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0",
              marginBottom: "0",
            }}
          >
            <div style={{ flex: 1 }} />
            <Button
              onClick={() => actions.set_is_preview(true)}
              bsStyle="info"
              style={{ height: "47.5px" }}
              disabled={is_preview}
            >
              Preview
            </Button>
            <div style={{ height: "5px" }} />
            <Button
              onClick={on_send_button_click}
              disabled={input.trim() === "" || is_uploading}
              bsStyle="success"
              style={{ height: "47.5px" }}
            >
              Send
            </Button>
          </div>
        </div>
        <div>{!IS_MOBILE ? render_bottom_tip() : undefined}</div>
      </div>
    );
  }

  if (messages == null || input == null) {
    return <Loading theme={"medium"} />;
  }
  return (
    <div
      onMouseMove={mark_as_read}
      onClick={mark_as_read}
      className="smc-vfill"
    >
      {render_body()}
    </div>
  );
};
