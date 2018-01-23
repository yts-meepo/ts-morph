﻿import * as path from "path";
import * as fs from "fs";
import {rootFolder} from "./config";
import {getAst, getClassViewModels, hasDescendantBaseType} from "./common";
import {InterfaceDeclaration} from "./../src/compiler";
import {ArrayUtils} from "./../src/utils";

// todo: This is messy... need to do a huge cleanup in here and the rest of this folder

const ast = getAst();
const nodeClassVMs = Array.from(getClassViewModels(ast)).filter(c => c.isNodeClass);

const compilerApiFile = ast.getSourceFileOrThrow("node_modules/typescript/lib/typescript.d.ts");
const apiNodeInterfaces = getApiNodeInterfaces();

const coveredInterfaces = apiNodeInterfaces.filter(i => nodeClassVMs.some(c => c.associatedTsNodes.some(n => n === i)) || isImplementedViaMixins(i));
const uncoveredInterfaces = apiNodeInterfaces.filter(i => coveredInterfaces.indexOf(i) === -1);
const toImplementInterfaces = uncoveredInterfaces.filter(i => !isIgnoredNode(i));
const ignoredInterfaces = uncoveredInterfaces.filter(i => isIgnoredNode(i));

// output
let output = "# Wrapped Nodes\n\n" +
    "This file is automatically generated and shows which nodes have been wrapped or not. " +
    "More information will be added to this in the future (ex. what properties are implemented or not for each node).\n\n";
outputCoverage("Exist", coveredInterfaces);
output += "\n";
outputCoverage("Not Exist", toImplementInterfaces);
fs.writeFileSync(path.join(rootFolder, "wrapped-nodes.md"), output);

function outputCoverage(header: string, interfaces: InterfaceDeclaration[], additionalText?: string) {
    output += `## ${header}\n\n`;
    if (additionalText != null)
        output += additionalText + "\n\n";
    output += `**Total:** ${interfaces.length}\n\n` +
        interfaces.map(i => "* " + i.getName() + (isImplementedViaMixins(i) ? " - Implemented via mixin." : "")).join("\n") + "\n";
}

function getApiNodeInterfaces() {
    const interfaces: InterfaceDeclaration[] = [];
    for (const interfaceDec of ArrayUtils.flatten(compilerApiFile.getNamespaces().map(n => n.getInterfaces()))) {
        if (interfaceDec.getBaseTypes().some(t => hasDescendantBaseType(t, checkingType => checkingType.getText() === "ts.Node")))
            interfaces.push(interfaceDec);
    }
    return interfaces;
}

function isIgnoredNode(node: InterfaceDeclaration) {
    switch (node.getName()) {
        // this would be implemented via a mixin
        case "Declaration":
            return true;
        default:
            return false;
    }
}

function isImplementedViaMixins(node: InterfaceDeclaration) {
    switch (node.getName()) {
        case "NamedDeclaration":
        case "FunctionLikeDeclarationBase":
        case "SignatureDeclarationBase":
            return true;
        default:
            return false;
    }
}