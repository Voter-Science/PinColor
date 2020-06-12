import * as React from "react";
import * as ReactDOM from "react-dom";

import * as trcSheet from 'trc-sheet/sheet'
import * as bcl from 'trc-analyze/collections'

import { SheetContainer, IMajorState } from 'trc-react/dist/SheetContainer'

import TRCContext from 'trc-react/dist/context/TRCContext';

import { Button } from 'trc-react/dist/common/Button';
import { ColumnCheck } from 'trc-react/dist/ColumnCheck';
import { ColumnSelector } from 'trc-react/dist/ColumnSelector';
import { Copy } from 'trc-react/dist/common/Copy';
import { Grid } from 'trc-react/dist/common/Grid';
import { HorizontalList } from 'trc-react/dist/common/HorizontalList';
import { SelectInput } from 'trc-react/dist/common/SelectInput';
import { Panel } from 'trc-react/dist/common/Panel';
import { PluginShell } from 'trc-react/dist/PluginShell';

// Lets somebody lookup a voter, and then answer questions about them.
// See all answers in Audit.

interface IState {
    _ci: trcSheet.IColumnInfo; // currently selected column
    _mapping: any; // maps from _Ci's possible values to a color code.
}

export class App extends React.Component<{}, IState> {
    static contextType = TRCContext;

    public constructor(props: any) {
        super(props);

        this.state = {
            _ci: undefined,
            _mapping: {}
        };

        this.renderValues = this.renderValues.bind(this);
        this.renderColorChoices = this.renderColorChoices.bind(this);
        this.renderCurrentColor = this.renderCurrentColor.bind(this);
        this.renderBody1 = this.renderBody1.bind(this);
        this.columnUpdate = this.columnUpdate.bind(this);
        this.onColorChanged = this.onColorChanged.bind(this);
        this.onApply = this.onApply.bind(this);
        this.onRemoveColors = this.onRemoveColors.bind(this);
    }

    private columnUpdate(ci: trcSheet.IColumnInfo) {
        // This will cause a re-render of renderColorChoices
        this.setState({
            _ci: ci,
            _mapping: {} // reset previous color mappings.
        });
    }

    // generate a TRC expression to handle the color. USe this for the new XColor column.
    // This will look like: switch(Party, 'value1', 'r', 'value2','b')
    private getColorExpression() {
        var expr = "switch(" + this.state._ci.Name;
        for (var name in this.state._mapping) {
            var colorVal = this.state._mapping[name];
            if (colorVal.length > 0) {
                expr += ",'" + name + "','" + colorVal + "'";
            }
        }
        expr += ")";

        return expr;
    }

    // Called after user has determined a color mapping and wants to apply it.
    private onApply() {
        var expr = this.getColorExpression();

        // SheetOps will pause the UI and handle errors.
        this.context.SheetOps.beginAdminOp((admin: trcSheet.SheetAdminClient) => {
            // Calling postNewExpressionAsync multiple times may not forcibly update the expression.
            // So first delete the column to force updated.
            // It's safe to delete a column that doesn't exist.
            return admin.postOpDeleteQuestionAsync("XColor").then( ()=>
                admin.postNewExpressionAsync("XColor", expr));
        });
    }

    // Remove the XColor column.
    private onRemoveColors() {
        var ok = confirm("Are you sure you want to remove the custom pin coloring from this sheet? (this will delete the XColor column)");
        if (!ok) {
            return;
        }
        this.context.SheetOps.beginAdminOp((admin: any) => {
            return admin.postOpDeleteQuestionAsync("XColor");
        });
    }

    private onColorChanged(event: any, columnValue: string) {
        var idx = event.target.value;

        var map = this.state._mapping;
        map[columnValue] = idx;
        this.setState({ _mapping: map });
    }
    private renderColorChoices(columnValue: string) {
        return (
            <SelectInput
                key={columnValue}
                label={columnValue}
                options={['Red', 'Green', 'Blue', 'Purple', 'Orange', 'Yellow']}
                values={['r', 'g', 'b', 'p', 'o', 'y']}
                onChange={x => this.onColorChanged(x, columnValue)}
            />
        );
    }

    // Given a Column, let us select a color for each possible value.
    private renderValues() {
        var ci = this.state._ci;
        // if (!ci || !ci.PossibleValues || ci.PossibleValues.length == 0) {
        if (!ci) return null;

        // Take union of possible values in sheet contents plus question.
        var vals: string[];
        {
            var set = new bcl.HashCount();
            this.context._contents[ci.Name].map((x: any) => set.Add(x));
            if (ci.PossibleValues) {
                ci.PossibleValues.map(x => set.Add(x));
            }
            vals = set.getKeys();
        }

        if (vals.length > 10) {
            return <div>Column has too many ({vals.length}) distinct values.</div>
        }

        return (
            <>
                {vals.map(columnValue => this.renderColorChoices(columnValue))}
                <HorizontalList alignRight>
                    <Button onClick={this.onApply}>
                        Apply
                    </Button>
                </HorizontalList>
            </>
        );
    }

    // Show the current coloring scheme.
    // Caller has already validated it has one.
    private renderCurrentColor(ci: trcSheet.IColumnInfo) {
        return (
            <Panel>
                <Copy>
                    {ci.Expression ? (
                        <>
                            <p>Current custom color scheme is:</p>
                            <pre>
{ci.Expression}
                            </pre>
                        </>
                    ) : (
                        <p>(sheet has an existing color scheme)</p>
                    )}
                </Copy>
                <HorizontalList alignRight>
                    <Button onClick={this.onRemoveColors}>
                        Remove custom coloring
                    </Button>
                </HorizontalList>
            </Panel>
        );
    }

    private renderBody1() {
        {
            return (
                <>
                    <ColumnCheck columnName="XColor" OnFound={this.renderCurrentColor}>
                        Sheet does not have a custom color scheme
                    </ColumnCheck>
                    <Panel>
                        <Copy>
                            <p>
                                Set a custom color scheme based on a column's values:
                            </p>
                        </Copy>
                        <Grid>
                            <ColumnSelector
                                Include={ci => true}
                                OnChange={this.columnUpdate}
                            />
                            <div>
                                {this.renderValues()}
                            </div>
                        </Grid>
                    </Panel>
                    <Panel>
                        <Copy>
                            <h4>Legend:</h4>
                        </Copy>
                        <HorizontalList>
                            <p>
                                Red: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Red.png" />
                            </p>
                            <p>
                                Blue: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Blue.png" />
                            </p>
                            <p>
                                Green: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Blue.png" />
                            </p>
                            <p>
                                Purple: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Purple.png" />
                            </p>
                            <p>
                                Orange: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Orange.png" />
                            </p>
                            <p>
                                Yellow: <img src="https://trcanvasdata.blob.core.windows.net/publicimages/marker_Yellow.png" />
                            </p>
                        </HorizontalList>
                    </Panel>
                </>
            );
        }
    }

    render() {
        // fetch contents so we can get possible values from the contents .
        return (
            <PluginShell title="PinColor" description="Set custom pin colors">
                {this.renderBody1()}
            </PluginShell>
        );
    };
}

ReactDOM.render(
    <SheetContainer fetchContents={true} requireTop={true}>
        <App />
    </SheetContainer>,
    document.getElementById("example")
);
