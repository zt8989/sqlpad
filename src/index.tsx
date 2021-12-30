import React from "react";
import { render } from "react-dom";
import { Row, Col, Card, Layout } from "antd";
import "antd/dist/antd.less";
import App from "./app";

const { Content } = Layout;

// Render editor
render(
  <Layout>
    <Layout>
      <Content>
        <App />
      </Content>
    </Layout>
  </Layout>,
  document.getElementById("app")
);
