import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Row,
  Col,
  Card,
  Layout,
  AutoComplete,
  Form,
  Checkbox,
  message,
  Tabs,
  Table,
  CheckboxProps,
  Divider,
  InputNumber,
} from "antd";
import AceEditor, { IAceEditorProps } from "react-ace";
import { toSqlLines, toSqlLinesData } from "./lib/sqlpad";
import _ from "lodash";

import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import "./code.less";
import { isClipboardWritingAllowed } from "./lib/command";
import { IAceEditor } from "react-ace/lib/types";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { useSize } from "./hooks/useSize";

const commonProps: Partial<IAceEditorProps> = {
  fontSize: 14,
  theme: "github",
};

const map = {
  " ": " (空格)",
};
const options = [" ", ",", "#", "%", "/"].map((value) => ({
  label: _.get(map, value, value),
  value,
}));

const dataKey = "__dataKey";
const templateSqlKey = "__templateSqlKey";
const delimiterKey = "__delimiterKey";
const inModeKey = "__inModeKey";
const dataSourceKey = "__dataSourceKey";
const startLineKey = "__startLineKey";

const setStore = (key: string) =>
  _.debounce(function (data: string) {
    localStorage.setItem(key, data);
  });

function toString(data: any) {
  return JSON.stringify({ data });
}

function toList(str: string | null) {
  if (_.trim(str || "")) {
    try {
      const list = JSON.parse(str!);
      return list.data || [];
    } catch (err) {}
  }
  return [];
}

export default function () {
  const [data, setData] = useState("");
  const [templateSql, setTemplateSql] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [inMode, setInMode] = useState(false);
  const [startLine, setStartLine] = useState(0);
  const [dataSource, setDataSource] = useState<string[]>([]);
  const editorRef = useRef<IAceEditor>(null);
  const layoutRef = useRef<HTMLElement>(document.body);
  const size = useSize(layoutRef);

  useEffect(() => {
    setData(localStorage.getItem(dataKey) || "");
    setTemplateSql(localStorage.getItem(templateSqlKey) || "");
    setDelimiter(localStorage.getItem(delimiterKey) || " ");
    setDataSource(toList(localStorage.getItem(dataSourceKey)));
    setStartLine(Number(localStorage.getItem(startLineKey)) || 0);
  }, []);

  const setStoreForData = setStore(dataKey);
  const setStoreForTemplateSql = setStore(templateSqlKey);
  const setStoreForDelimiter = setStore(delimiterKey);
  const setStoreForDataSource = setStore(dataSourceKey);

  const dispatch = (type: string, data: any) => {
    switch (type) {
      case "data":
        setData(data);
        setStoreForData(data);
        break;
      case "templateSql":
        setTemplateSql(data);
        setStoreForTemplateSql(data);
        break;
      case "delimiter":
        setDelimiter(data);
        setStoreForDelimiter(data);
      case "dataSource":
        setDataSource(data);
        setStoreForDataSource(toString(data));
        break;
    }
  };

  const generateSql = useMemo(() => {
    return toSqlLines(
      toSqlLinesData(data, delimiter, startLine),
      templateSql,
      inMode
    ).join("\n");
  }, [data, templateSql, delimiter, inMode, startLine]);

  const onDataChanged = useCallback((data: string) => {
    dispatch("data", data);
  }, []);
  const onTemplateChanged = useCallback((data: string) => {
    dispatch("templateSql", data);
  }, []);
  const onDelimiterChanged = useCallback((data: string) => {
    dispatch("delimiter", data);
  }, []);

  const removeDataSource = (dataSource: string[], sql: string) =>
    dispatch(
      "dataSource",
      dataSource.filter((x) => x !== sql)
    );

  const onCollectionChanged = useCallback(
    (e: CheckboxChangeEvent) => {
      if (e.target.checked) {
        dispatch("dataSource", [...dataSource, templateSql]);
      } else {
        removeDataSource(dataSource, templateSql);
      }
    },
    [dataSource, templateSql]
  );

  const onCopy = () => {
    // 1. Instantiate editor
    let editor = editorRef.current?.editor as IAceEditor;

    editor.selectAll();
    // 2. Store text that will be copied to clipboard
    let copyText = editor.getCopyText();

    editor.clearSelection();
    // 4. Verify if clipboard writing is allowed
    isClipboardWritingAllowed()
      .then(function (allowed) {
        // 5. Write to clipboard if allowed (simulating that text has been cutted from the editor)
        if (allowed) {
          navigator.clipboard.writeText(copyText).then(function () {
            message.success("复制成功!");
          });
        }
      })
      .catch(function (err) {
        console.log("Cannot copy to clipboard", err);
      });
  };

  return (
    <div className="sqlpad-content">
      <Row>
        <Col span={12} xs={24}>
          <div className="editor-wrapper">
            <div className="card-header">
              <div>数据</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span>起始行：</span>
                <InputNumber
                  size="small"
                  value={startLine}
                  onChange={(e) => setStartLine(e)}
                />
              </div>
            </div>
            <AceEditor
              {...commonProps}
              mode="text"
              onChange={onDataChanged}
              value={data}
              width="100%"
              height={200 + Math.max((size.height - 600) * 0.4, 0) + "px"}
              name="csv-data"
              editorProps={{ $blockScrolling: true }}
            />
          </div>
        </Col>
        <Col span={24}>
          <div className="card-header">
            <div>模板sql</div>
            <a href="#" onClick={onCopy}>
              复制
            </a>
          </div>
          <Tabs
            tabBarExtraContent={
              <Form layout="inline">
                <Form.Item label="分隔符">
                  <AutoComplete
                    size="small"
                    style={{ width: "100px" }}
                    value={delimiter}
                    onSelect={onDelimiterChanged}
                    options={options}
                  ></AutoComplete>
                </Form.Item>
                <Form.Item label="IN模式">
                  <Checkbox
                    checked={inMode}
                    onChange={(e) => setInMode(e.target.checked)}
                  />
                </Form.Item>
                <Form.Item label="收藏">
                  <Checkbox
                    checked={dataSource.includes(templateSql)}
                    onChange={onCollectionChanged}
                  />
                </Form.Item>
              </Form>
            }
          >
            <Tabs.TabPane tab="代码区" key="code">
              <Row>
                <Col span={24}>
                  <AceEditor
                    {...commonProps}
                    mode="sql"
                    enableLiveAutocompletion
                    enableSnippets
                    enableBasicAutocompletion
                    width="100%"
                    height={50 + Math.max((size.height - 600) * 0.2, 0) + "px"}
                    onChange={onTemplateChanged}
                    value={templateSql}
                    name="template-sql"
                    editorProps={{ $blockScrolling: true }}
                  />
                </Col>
              </Row>
            </Tabs.TabPane>
            <Tabs.TabPane tab="收藏区" key="collection">
              <Table
                size="small"
                dataSource={_(dataSource)
                  .reverse()
                  .map((sql) => ({ sql }))
                  .value()}
              >
                <Table.Column title="语句" dataIndex="sql"></Table.Column>
                <Table.Column
                  title="操作"
                  width={100}
                  render={(text, record: any) => {
                    return (
                      <>
                        <a href="#" onClick={() => setTemplateSql(record.sql)}>
                          选择
                        </a>
                        <Divider type="vertical" />
                        <a
                          href="#"
                          onClick={() =>
                            removeDataSource(dataSource, record.sql)
                          }
                        >
                          删除
                        </a>
                      </>
                    );
                  }}
                ></Table.Column>
              </Table>
            </Tabs.TabPane>
          </Tabs>
        </Col>
        <Col span={12} xs={24}>
          <div className="card-header">
            <div>生成的sql</div>
            <a href="#" onClick={onCopy}>
              复制
            </a>
          </div>
          <div className="editor-wrapper">
            <AceEditor
              {...commonProps}
              readOnly
              ref={editorRef}
              mode="sql"
              wrapEnabled
              width="100%"
              height={200 + Math.max((size.height - 600) * 0.4, 0) + "px"}
              name="generate-sql"
              value={generateSql}
              editorProps={{ $blockScrolling: true }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
