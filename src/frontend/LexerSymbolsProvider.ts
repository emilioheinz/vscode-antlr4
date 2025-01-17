/*
 * This file is released under the MIT license.
 * Copyright (c) 2018, 2021, Mike Lischke
 *
 * See LICENSE file for more info.
 */

/* eslint-disable max-classes-per-file */

import { Vocabulary } from "antlr4ts";
import * as path from "path";

import { TreeItem, TreeItemCollapsibleState, Command, ProviderResult } from "vscode";
import { AntlrTreeDataProvider } from "./AntlrTreeDataProvider";

export class LexerSymbolItem extends TreeItem {

    public iconPath = {
        light: path.join(__dirname, "..", "..", "..", "misc", "token-light.svg"),
        dark: path.join(__dirname, "..", "..", "..", "misc", "token-dark.svg"),
    };

    public contextValue = "lexerSymbols";

    public constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        command?: Command,
    ) {
        super(label, collapsibleState);
        this.command = command;
    }

}

export class LexerSymbolsProvider extends AntlrTreeDataProvider<LexerSymbolItem> {

    public getChildren(element?: LexerSymbolItem): ProviderResult<LexerSymbolItem[]> {
        return new Promise((resolve, reject) => {
            if (!element) {
                let vocabulary;
                if (this.currentFile) {
                    vocabulary = this.backend.getLexerVocabulary(this.currentFile);
                }

                if (vocabulary) {
                    const promises: Array<Promise<LexerSymbolItem>> = [];
                    for (let i = 0; i <= vocabulary.maxTokenType; ++i) {
                        promises.push(this.generateTreeItem(i, vocabulary));
                    }

                    Promise.all(promises).then((items) => {
                        items.unshift(new LexerSymbolItem("-1: EOF", TreeItemCollapsibleState.None, {
                            title: "<unused>",
                            command: "",
                            arguments: [],
                        }));
                        resolve(items);
                    }).catch((reason) => {
                        reject(reason);
                    });

                }
            } else {
                resolve(null);
            }
        });
    }

    private async generateTreeItem(index: number, vocabulary: Vocabulary): Promise<LexerSymbolItem> {
        const literal = vocabulary.getLiteralName(index);
        const symbolic = vocabulary.getSymbolicName(index);
        let caption = `${index}: `;
        if (!literal && !symbolic) {
            caption += "<unused>";
        } else {
            if (symbolic) {
                caption += symbolic;
            } else {
                caption += "<implicit token>";
            }

            if (literal) {
                caption += " (" + literal + ")";
            }
        }

        const alternative = literal ?? "";
        const info = await this.backend.infoForSymbol(this.currentFile ?? "",
            symbolic ?? alternative.substr(1, alternative.length - 2));

        const parameters: Command = { title: "", command: "" };
        if (info && info.definition) {
            parameters.title = "";
            parameters.command = "antlr.selectGrammarRange";
            parameters.arguments = [info.definition.range];
        }

        return new LexerSymbolItem(caption, TreeItemCollapsibleState.None, parameters);
    }
}
