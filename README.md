# gatsby-custom-md
Plugin that allows custom components inside markdown. Supports markdown as children.

## Installation

```
npm install --save gatsby-custom-md
```

This plugin is created for use with gatsby. It requires the `htmlAst` form graphql query.

## Usage

Import the plugin

```javascript
import MD from "gatsby-custom-md"
```

Import the components to be added, and add them to an object.

```javascript
import { Component1, Component2, ComponentN } from './file'

const components = {
  comp1: Component1,
  comp2: Component2,
  compN: Component3
}
```

Now render it.

```javascript
// data.markdownRemark.htmlAst is received from graphql query.
<MD components={components} htmlAst={data.markdownRemark.htmlAst}/>
```

Now in the markdown file, you can use the components as follows.

```
# Title

[comp1]
This is first component
**Markdown is supported inside it.
[/comp1]

[comp2]
Second Component
[/comp2]

```


Example usage for grid creation.

`template.js`

```
import MD from "gatsby-custom-md";
import { Row, Col } from "./grid";

let components = {
  row: Row,
  col: Col
};

export default function({ data }) {
  return (
    <Layout>
      <MD components={components} htmlAst={data.markdownRemark.htmlAst} />
    </Layout>
  );
}

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      htmlAst
    }
  }
`;

```


`grid.js`

```javascript
import React from "react";

export const Row = function({ children }) {
  return (
    <div className="row flex" style={{ color: "red" }}>
      {children}
    </div>
  );
};

export const Col = function({ children }) {
  return (
    <div className="col">
      <div>{children}</div>
    </div>
  );
};
```

`markdown.md`

```
[row]
[col]
![image](./image.jpg)
*Text*
[/col]
[col]
![image](./image.jpg)
*Text*
[/col]
[col]
![image](./image.jpg)
*Text*
[/col]
[/row]
```
