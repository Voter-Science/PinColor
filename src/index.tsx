import * as React from "react";
import * as ReactDOM from "react-dom";

import * as trcSheet from 'trc-sheet/sheet'
import * as bcl from 'trc-analyze/collections'

import { SheetContainer, IMajorState } from 'trc-react/dist/SheetContainer'

import TRCContext from 'trc-react/dist/context/TRCContext';

import { PluginShell } from 'trc-react/dist/PluginShell';
import { ColumnSelector } from 'trc-react/dist/ColumnSelector';
import { ColumnCheck } from 'trc-react/dist/ColumnCheck';

// Lets somebody lookup a voter, and then answer questions about them.
// See all answers in Audit.
export class App extends React.Component<{}, {
    _ci: trcSheet.IColumnInfo // currently selected column
    _mapping: any, // maps from _Ci's possible values to a color code.
}>
{
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
        return <select onChange={x => this.onColorChanged(x, columnValue)} >
            <option key="k1" value="">(none)</option>
            <option key="k2" value="r">Red</option>
            <option key="k3" value="g">Green</option>
            <option key="k4" value="b">Blue</option>
            <option key="k5" value="p">Purple</option>
            <option key="k6" value="o">Orange</option>
            <option key="k7" value="y">Yellow</option>
        </select>
    }

    // Given a Column, let us select a color for each possible value.
    private renderValues() {
        var ci = this.state._ci;
        // if (!ci || !ci.PossibleValues || ci.PossibleValues.length == 0) {
        if (!ci) {
            return <div>(select a column)</div>
        }

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
            return <div>Column has too many ({vals.length}) distinct values. </div>
        }

        // var vals = ci.PossibleValues;

        return <div>
            <table>
                <thead>
                    <tr>
                        <td>Value</td>
                        <td>Color</td>
                    </tr>
                </thead>
                <tbody>
                    {vals.map((columnValue, idx) =>
                        <tr key={idx}>
                            <td>
                                {columnValue}
                            </td>
                            <td>
                                {this.renderColorChoices(columnValue)}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <button onClick={this.onApply}>Apply!</button>
        </div>
    }

    // Show the current coloring scheme.
    // Caller has already validated it has one.
    private renderCurrentColor(ci: trcSheet.IColumnInfo) {
        return <div>
            {ci.Expression ?
                <div>Current custom color scheme is: {ci.Expression}</div> :
                <div>(sheet has an existing color scheme)</div>
            }
            <button onClick={this.onRemoveColors}>Remove custom coloring!</button>
        </div>
    }

    private renderBody1() {
        {
            // <ListColumns Include={ci => ci.IsReadOnly && ci.PossibleValues != null}></ListColumns>
            return <div>
                <ColumnCheck columnName="XColor" OnFound={this.renderCurrentColor}>
                    Sheet does not have a custom color scheme
                </ColumnCheck>
                <div>------</div>
                <div>Set a custom color scheme based on a column's values:</div>
                <ColumnSelector Include={ci => true} OnChange={this.columnUpdate} ></ColumnSelector>
                {this.renderValues()}

            </div>
        }
    }

    render() {
        // fetch contents so we can get possible values from the contents .
        return <PluginShell title="PinColor" description="Set custom pin colors">
            {this.renderBody1()}
        </PluginShell>

    };
}

ReactDOM.render(
    <SheetContainer fetchContents={true} requireTop={true}>
        <App />
    </SheetContainer>,
    document.getElementById("example")
);
