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
  AutoComplete,
  Form,
  Checkbox,
  message,
  Tabs,
  Table,
  Divider,
  InputNumber,
  Input,
  Button,
  Modal,
} from "antd";
import AceEditor, { IAceEditorProps } from "react-ace";
import { toSqlLines, toSqlLinesData } from "./lib/sqlpad";
import _ from "lodash";
import { CopyToClipboard } from "react-copy-to-clipboard";

import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import "./code.less";
import { isClipboardWritingAllowed } from "./lib/command";
import { IAceEditor } from "react-ace/lib/types";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { useSize } from "./hooks/useSize";
import { toCollectionType } from "./lib/collection-service";
import { CollectionType } from "./lib/types";
import { GenerateService } from "./lib/generate-id-service";

const commonProps: Partial<IAceEditorProps> = {
  fontSize: 14,
  theme: "github",
};

const map = {
  " ": " (空格)",
  "\t":"\t(TAB)"
};
const options = [" ", "\t", ",", "#", "%", "/"].map((value) => ({
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

const Types = {
  templateSql: "templateSql",
  selectCollection: "selectCollection",
  "dataSource": "dataSource"
}

export default function () {
  const [data, setData] = useState("");
  const [templateSql, setTemplateSql] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [inMode, setInMode] = useState(false);
  const [startLine, setStartLine] = useState(0);
  const [dataSource, setDataSource] = useState<CollectionType[]>([]);
  const [collection, setCollection] = useState<CollectionType | null>(null)
  const editorRef = useRef<IAceEditor>(null);
  const layoutRef = useRef<HTMLElement>(document.body);
  const size = useSize(layoutRef);
  const [activeTab, setActiveTab] = useState("code")
  const [visible, setVisible] = useState(false)
  const [searchName, setSearchName] = useState("")
  const [form] = Form.useForm() 
  const [id, setId] = useState(0)

  const onSearch = useCallback((e) => {
    const name = e.target.value
    setSearchName(name)
  }, [])

  const onSearchRest = useCallback(() => {
    onSearch({ target: { value: "" } })
  }, [])

  const onSubmit = useCallback(() => {
    form.validateFields().then(res => {
      let id: number
      if(dataSource.length == 0){
        id = 1
      } else {
        id = dataSource[dataSource.length - 1].id + 1
      }
      const c = { ...res, sql: templateSql, id, startLine }
      dispatch(Types.dataSource, [...dataSource, c])
      setCollection(c)
      setVisible(false)
      return form.resetFields()
    })
  }, [dataSource, templateSql, startLine])

  const updateCollection = useCallback(() => {
    dispatch(Types.dataSource, dataSource.map(it => {
      if(it.id === collection?.id){
        return {
          ...it,
          sql: templateSql
        }
      }
      return it
    }))
  }, [collection])

  useEffect(() => {
    const data = localStorage.getItem(dataKey) || ""
    setData(data);
    serviceRef.current = GenerateService.make(data)
    setTemplateSql(localStorage.getItem(templateSqlKey) || "");
    setDelimiter(localStorage.getItem(delimiterKey) || " ");
    setDataSource(toCollectionType(localStorage.getItem(dataSourceKey)));
    setStartLine(Number(localStorage.getItem(startLineKey)) || 0);
  }, []);

  const setStoreForData = setStore(dataKey);
  const setStoreForTemplateSql = setStore(templateSqlKey);
  const setStoreForDelimiter = setStore(delimiterKey);
  const setStoreForDataSource = setStore(dataSourceKey);
  const serviceRef = useRef(GenerateService.make(data))

  const dispatch = (type: string, data: any) => {
    switch (type) {
      case "data":
        setData(data);
        setStoreForData(data);
        serviceRef.current = GenerateService.make(data)
        break;
      case Types.templateSql:
        setTemplateSql(data);
        setStoreForTemplateSql(data);
        break;
      case "delimiter":
        setDelimiter(data);
        setStoreForDelimiter(data);
      case Types.dataSource:
        setDataSource(data);
        setStoreForDataSource(toString(data));
        break;
      case Types.selectCollection:
        dispatch(Types.templateSql, data.sql);
        setCollection(data)
        setStartLine(data.startLine || 0)
        break
    }
  };

  const filterDataSource = useMemo(() => _(dataSource)
  .reverse()
  .filter(value => {
    if(_.trim(searchName)){
      return value.name.includes(_.trim(searchName))
    }
    return true
  })
  .value(), [dataSource, searchName])

  const generateSql = useMemo(() => {
    return toSqlLines(
      { content:data, 
        delimiter, 
        startLine, 
        sqlTemplate: templateSql,
        inMode,
        service: serviceRef.current
      }
    ).join("\n");
  }, [data, templateSql, delimiter, inMode, startLine, id]);

  const onDataChanged = useCallback((data: string) => {
    dispatch("data", data);
  }, []);
  const onTemplateChanged = useCallback((data: string) => {
    dispatch(Types.templateSql, data);
  }, []);
  const onDelimiterChanged = useCallback((data: string) => {
    dispatch("delimiter", data);
  }, []);

  const removeDataSource = (record: CollectionType) =>
    dispatch(
      "dataSource",
      dataSource.filter((x) => x.id !== record.id)
    );

  const onCopy = (text: string, result: boolean) => {
    if (result) {
      message.success("复制成功!");
    }
  };

  const onNextId = useCallback(() => {
    serviceRef.current = GenerateService.make(data, true)
    setId(id+1)
  }, [data, id])

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
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            tabBarExtraContent={
              activeTab === "code" ? 
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
                  <a type="link" onClick={() => setVisible(true)}>保存</a>
                  {collection?.id && collection?.sql !== templateSql && <><Divider type="vertical"/><a type="link" onClick={updateCollection}>更新</a></>}
                </Form.Item>
              </Form> : 
              <Form layout="inline">
                <Form.Item label="名称">
                  <Input size="small" value={searchName} onChange={onSearch}/>
                </Form.Item>
                <Form.Item>
                  <Button size="small" onClick={onSearchRest}>重置</Button>
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
                    ref={editorRef}
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
                dataSource={filterDataSource}
              >
                <Table.Column title="名称" dataIndex="name"></Table.Column>
                <Table.Column title="语句" dataIndex="sql"></Table.Column>
                <Table.Column
                  title="操作"
                  width={100}
                  render={(text, record: CollectionType) => {
                    return (
                      <>
                        <a href="#" onClick={() => {
                            dispatch(Types.selectCollection, record)
                            setActiveTab("code")
                            editorRef.current?.setValue(record.sql)
                          }}>
                          选择
                        </a>
                        <Divider type="vertical" />
                        <a
                          href="#"
                          onClick={() =>
                            removeDataSource(record)
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
            <div>
              <a href="#" onClick={onNextId}>生成下一批ID</a>
              <Divider type="vertical"></Divider>
              <CopyToClipboard text={generateSql} onCopy={onCopy}>
                <a href="#">复制</a>
              </CopyToClipboard>
            </div>
          </div>
          <div className="editor-wrapper">
            <AceEditor
              {...commonProps}
              readOnly
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
    <Modal title="收藏" visible={visible} okText="收藏" cancelText="取消" onOk={onSubmit} onCancel={() => setVisible(false)}>
      <Form form={form}>
        <Form.Item name={"name"} rules={[{required: true}]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
    </div>
  );
}
