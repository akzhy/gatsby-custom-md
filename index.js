/* This plugin was created for a personal project and then converted to a general purpose plugin.
I've been out of the loop for some time, so my knowledge of latest JS is somewhat limited.
The below program could be shortened using better javascript.

Keep this in mind before reading.
*/

const React = require("react");
const rehypeReact = require("rehype-react");
const parse = require('html-react-parser');


const renderAst = new rehypeReact({createElement: React.createElement}).Compiler

/**
 * The main function
 * @param {Object} props
*/

module.exports = function(props) {
	/*
	So the Idea is to scan the HAST for starting and ending tags, then the data between those tags are passed as children to the given react component.
	The react component is then converted to HAST form.
	*/

	const components = props.components;
	const htmlAstOriginal = props.htmlAst;
	let htmlAst = JSON.parse(JSON.stringify(htmlAstOriginal)); // This is to copy the given object.

	let mainStack = []; // Stack that stores the position of opening and closing tags

	// Seperate each line into a new object.
	htmlAst.children.forEach(function(e, i) {
		if (e.tagName === "p") {
			let clen = e.children.length;
			let ci = 0;

			while (ci < clen) {
				let value = e.children[ci].value;
				if (typeof(value) !== "string")
					return;
				if (!/(\r\n|\n|\r)/gm.exec(value))
					return;
				let lineSepreated = value.split(/(\r\n|\n|\r)/gm);

				let increment = 0;

				lineSepreated.forEach(function(lse, lsi) {
					if (lse.trim().length > 0) {
						if (lsi === 0) {
							htmlAst.children[i].children[ci] = {
								type: "text",
								value: lse
							}
						} else {
							htmlAst.children[i].children.splice((ci+increment), 0, {
								type: "text",
								value: lse
							})
						}
						clen = e.children.length;

						increment++;
					}
				})
				ci++;
			}
		}
	})

	// Scan for starting end ending tags, they are in the form [component-name] and [/component-name] respectively.

	htmlAst.children.forEach(function(e, i) {
		if (e.tagName === "p") {
			e.children.forEach(function(ec, ic) {
				let arr = [];
				let value = ec.value;

				if (typeof(value) !== "string")
					return;

				for (let ck in components) {
					if (components.hasOwnProperty(ck)) {

						// Detect starting tags, the regex checks for shortcodes

						const testString = '\\[(['+ck+']+)([^]*?)(\\/?)\\](?:([^]*?)\\[\\/\\1\\s*\\])?';
						const regex = new RegExp(testString,"g");

						const match = value.match(regex);

						// If a starting tag is found, it's index and other details are recorded and the attributes are extracted.
						if (match) {
							let m = match[0];
							
							let comp = m.split(" ")[0];

							comp = comp[comp.length - 1] === "]" ? comp : comp+"]";
							
							if(comp !== `[${ck}]`) continue;

							// The below code extracts attributes by converting the shortcode to a span element. Then the attributes are fetched using normal methods. 

							let htmlString = m.replace(`[${ck}`,'<span');
							let lI = htmlString.lastIndexOf(']');
							let full = htmlString.substr(0, lI) + '></span>' + htmlString.substr(lI + 7);
							
							let reactElem = parse(full);
							let rProps = reactElem.props;
							delete rProps.children;
							let allAtts = rProps;

							arr.push({
								c: ck,
								type: "open",
								attrs: allAtts,
								pos: [
									i,
									ic,
									[
										value.indexOf(match),
										match.length
									]
								],
								tag: match
							})
						}
						if (value.indexOf(`[/${ck}]`) !== -1) {
							arr.push({
								c: ck,
								type: "close",
								pos: [
									i,
									ic,
									[
										value.indexOf(`[/${ck}]`),
										`[${ck}]`.length
									]
								],
								tag: `[/${ck}]`
							})
						}
					}
				}

				/* Sorting required because the components are scanned in the order that is provided by the user,
					For example, if `col`,`row` are given as components, and `col` is a child of `row`, then `col` is scanned first, even though row should be first, therefore the array is sorted based on the index they appear.
				*/

				arr.sort(function(a, b) {
					return a.pos[2][0] == b.pos[2][0]
						? 0
						: + (a.pos[2][0] > b.pos[2][0]) || -1;
				})

				mainStack.push(...arr);

			})
		}
	})

	let startStack = [];
	let endStack = [];

	/*
	Properly match the ending tags to the starting tags.
	*/

	for (let l = 0; l < mainStack.length; l++) {
		let numOpeningFound = 0;
		if (mainStack[l].type === "close")
			continue;
		for (let m = l + 1; m < mainStack.length; m++) {
			if (mainStack[m].tag === mainStack[l].tag) {
				numOpeningFound += 1;
			} else {
				if (mainStack[m].c === mainStack[l].c) {
					numOpeningFound -= 1;

					if (numOpeningFound === -1) {
						startStack.push(mainStack[l]);
						endStack.push(mainStack[m]);
						break;
					}
				}
			}
		}
	}

	let start = startStack.pop();

	let end = endStack.pop();

	// Pop all the items of startStack until there are none.

	while (start != undefined) {

		let p = [];

		let s1 = start.pos[0];
		let e1 = end.pos[0];

		/*

		The below loops will search the HAST and extract the data between the starting and ending tags.

		*/

		for (let l = s1; l <= e1; l++) {
			// Find the value of the next starting point. ie child Object index
			let s2 = l === s1
				? start.pos[1]
				: 0;

			// Checking for text oe empty lines. They are kept as they are.
			if (htmlAst.children[l] && htmlAst.children[l].children == undefined) {
				p.push(htmlAst.children[l]);
				continue;
			}

			let e2 = l === e1
				? end.pos[1]
				: htmlAst.children[l].children.length - 1;


			for (let m = s2; m <= e2; m++) {

				if (l === s1 && m === s2 && l === e1 & m === e2) {
					let cText = htmlAst.children[l].children[m].value;
					if (htmlAst.children[l].children[m].replaceTagEnd == undefined) {
						htmlAst.children[l].children[m].replaceTagEnd = [];
					}

					htmlAst.children[l].children[m].replaceTagEnd.push(`[/${end.c}]`);

					if (htmlAst.children[l].children[m].replaceTagStart == undefined) {
						htmlAst.children[l].children[m].replaceTagStart = [];
					}

					htmlAst.children[l].children[m].replaceTagStart.push(start.match);

					p.push({
						type: "text",
						value: cText.substring(cText.indexOf(start.tag), cText.indexOf(end.tag) + end.tag.length),
						replaceTagEnd: htmlAst.children[l].children[m].replaceTagEnd,
						replaceTagStart: htmlAst.children[l].children[m].replaceTagStart
					})

					htmlAst.children[l].children[m].value = cText.replace(cText.substring(cText.indexOf(start.tag), cText.indexOf(end.tag) + end.tag.length), "");

				} else if (l === s1 && m === s2) {

					let cText = htmlAst.children[l].children[m].value;
					if (htmlAst.children[l].children[m].replaceTagStart == undefined) {
						htmlAst.children[l].children[m].replaceTagStart = [];
					}
					htmlAst.children[l].children[m].replaceTagStart.push(start.tag);

					let val = cText.substring(cText.indexOf(start.tag), cText.length);

					p.push({type: "text", value: val, replaceTagStart: htmlAst.children[l].children[m].replaceTagStart})

					htmlAst.children[l].children[m].value = cText.replace(val, "")

				} else if (l === e1 && m === e2) {

					if (Object.keys(htmlAst.children[l].children[m]).length === 0)
						continue;

					let cText = htmlAst.children[l].children[m].value;

					if (htmlAst.children[l].children[m].replaceTagEnd == undefined) {
						htmlAst.children[l].children[m].replaceTagEnd = [];
					}

					htmlAst.children[l].children[m].replaceTagEnd.push(`[/${end.c}]`)

					p.push({
						type: "text",
						value: cText.substring(0, cText.indexOf(end.tag) + end.tag.length),
						replaceTagEnd: htmlAst.children[l].children[m].replaceTagEnd
					})

					htmlAst.children[l].children[m].value = cText.replace(cText.substring(0, cText.indexOf(end.tag) + end.tag.length), "")

				} else {

					// Plain text is displayed as a paragraph element.

					if (htmlAst.children[l].children[m].type === "text" && htmlAst.children[l].children[m].value.trim().length !== 0) {
						htmlAst.children[l].children[m].type = "element"
						htmlAst.children[l].children[m].tagName = "p"
						htmlAst.children[l].children[m].children = [];
						htmlAst.children[l].children[m].children.push({type: "text", value: htmlAst.children[l].children[m].value})
					}

					p.push(htmlAst.children[l].children[m])
					htmlAst.children[l].children[m] = {};
				}
			}
		}

		// Remove the starting and ending tags.

		p.forEach(function(e, i) {
			if (!e)
				return;
			if (e.replaceTagStart) {
				e.replaceTagStart.forEach(function(er, ir) {
					p[i].value = e.value.replace(er, "");
				})
			}
			if (e.replaceTagEnd) {
				e.replaceTagEnd.forEach(function(er, ir) {
					p[i].value = e.value.replace(er, "");
				})
			}
		})

		let pLen = p.length - 1;

		// Remove empty objects

		while (pLen >= 0) {
			if (!p[pLen]) {
				pLen--;
				continue;
			}
			if (Object.keys(p[pLen]).length == 0) {
				p.splice(pLen, 1);
			}
			pLen--;
		}

		// Execute the react component with the data as children.

		let t = components[start.c]({
			attrs: start.attrs,
			children: {
				type: "child",
				p
			}
		});

		// Traverse the React Tree and convert it into HAST
		let trav = RtoHAST(t);

		// Add the tree to the original.
		if (htmlAst.children[start.pos[0]].children[start.pos[1] + 1] == undefined) {
			htmlAst.children[start.pos[0]].children.splice(start.pos[1] + 1, 0, trav[0]);
		} else {
			htmlAst.children[start.pos[0]].children[start.pos[1] + 1] = trav[0];
		}

		// Change the parent element to div

		htmlAst.children[start.pos[0]].tagName = "div";

		start = startStack.pop();
		end = endStack.pop();
	}

	/**
	* Converts React tree to HAST
	* @param {Object} node - React Tree
	* @param {arr} array - It is used to store data during recursion, not required while calling the function.
	*/
	function RtoHAST(node, arr) {
		if (typeof(node) === "string") {
			let obj = {
				type: "text",
				value: node
			}
			arr.push(obj);
			return arr;
		}

		if (!node.props)
			return false;

		if (arr == undefined)
			arr = [];

		let obj = {
			type: "element",
			tagName: node.type,
			properties: {},
			children: []
		}

		if(node.props.style){
			let style = node.props.style;
			let styleKeys = Object.keys(style);
			let styles = [];

			styleKeys.forEach((e) => {
				styles.push(e+":"+style[e]);
			})

			styles = styles.join(";")+";";

			obj.properties.style = styles;
		}

		if (node.props.className) {
			obj.properties.className = node.props.className.split(" ");
		}

		if (node.props.children && node.props.children.type === "child") {
			obj.children = node.props.children.p;
			arr.push(obj)
		} else {

			arr.push(obj)
			var children = React.Children.toArray(node.props.children);
			children.forEach(function(e, i) {
				RtoHAST(e, obj.children);
			})
		}

		return arr;
	}

	return (renderAst(htmlAst))

}
