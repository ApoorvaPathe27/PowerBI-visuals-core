/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    export interface LineChartBehaviorOptions {
        lines: D3.Selection;
        interactivityLines: D3.Selection;
        dots: D3.Selection;
        areas: D3.Selection;
        isPartOfCombo?: boolean;
        tooltipOverlay: D3.Selection;
        getCategoryIndex(seriesData: LineChartSeries, pointX: number): number;
        categoryIdentities?: SelectionId[];
    }

    export class LineChartWebBehavior implements IInteractiveBehavior {
        private lines: D3.Selection;
        private dots: D3.Selection;
        private areas: D3.Selection;
        private tooltipOverlay: D3.Selection;

        public bindEvents(options: LineChartBehaviorOptions, selectionHandler: ISelectionHandler): void {
            this.lines = options.lines;
            let interactivityLines = options.interactivityLines;
            let dots = this.dots = options.dots;
            let areas = this.areas = options.areas;
            let tooltipOverlay = this.tooltipOverlay = options.tooltipOverlay;
            let getPointX = (rootNode) => this.getPointX(rootNode);

            interactivityLines.on('click', function (d: LineChartSeries, index: number) {
                let categoryIndex = options.getCategoryIndex(d, getPointX(this));
                // Due to nulls, simple use of category index doesn't work, so search for a data point with a matching category index; if one doesn't
                //   exist, create an ad-hoc id with the seriesIndex as identity and categoryIndex as specific identity (for drill).
                let dataPoint = _.find(d.data, (dataPoint: LineChartDataPoint) => dataPoint.categoryIndex === categoryIndex);
                if (dataPoint) {
                    selectionHandler.handleSelection(dataPoint, d3.event.ctrlKey);
                }
                else {
                    selectionHandler.handleSelection({ selected: d.selected, identity: d.identity, specificIdentity: options.categoryIdentities[categoryIndex] }, d3.event.ctrlKey);
                }
            });
            
            interactivityLines.on('contextmenu', function (d: LineChartSeries, index: number) {
                if (d3.event.ctrlKey)
                    return;

                d3.event.preventDefault();

                let position = InteractivityUtils.getPositionOfLastInputEvent();

                let categoryIndex = options.getCategoryIndex(d, getPointX(this));
                let dataPoint = _.find(d.data, (dataPoint: LineChartDataPoint) => dataPoint.categoryIndex === categoryIndex);
                if (dataPoint) {
                    selectionHandler.handleContextMenu(dataPoint, position);
                }
                else {
                    selectionHandler.handleContextMenu({ selected: d.selected, identity: d.identity, specificIdentity: options.categoryIdentities[categoryIndex] }, position);
                }
            });
            
            InteractivityUtils.registerStandardInteractivityHandlers(dots, selectionHandler);

            if (areas) {
                InteractivityUtils.registerStandardInteractivityHandlers(areas, selectionHandler);
            }

            if (tooltipOverlay) {
                if (!_.isEmpty(options.categoryIdentities)) {
                    tooltipOverlay.on('click', function () {
                        let categoryIndex = options.getCategoryIndex(undefined, getPointX(this));
                        selectionHandler.handleSelection({
                            selected: false,
                            identity: undefined,
                            specificIdentity: options.categoryIdentities[categoryIndex],
                        }, d3.event.ctrlKey);
                    });
                    tooltipOverlay.on('contextmenu', function () {
                        if (d3.event.ctrlKey)
                            return;

                        d3.event.preventDefault();

                        let position = InteractivityUtils.getPositionOfLastInputEvent();
                        let categoryIndex = options.getCategoryIndex(undefined, getPointX(this));
                        selectionHandler.handleContextMenu({
                            selected: false,
                            identity: undefined,
                            specificIdentity: options.categoryIdentities[categoryIndex],
                        }, position);
                    });
                }
                else {
                    tooltipOverlay.on('click', () => selectionHandler.handleClearSelection());
                }
            }
        }

        public renderSelection(hasSelection: boolean) {
            this.lines.style("stroke-opacity", (d: SelectableDataPoint) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false));
            this.dots.style("fill-opacity", (d: SelectableDataPoint) => ColumnUtil.getFillOpacity(d.selected, false, hasSelection, false));
            if (this.areas)
                this.areas.style("fill-opacity", (d: SelectableDataPoint) => (hasSelection && !d.selected) ? LineChart.DimmedAreaFillOpacity : LineChart.AreaFillOpacity);
        }

        private getPointX(rootNode: Element): number {
            let e = d3.event, s;
            while (s = e.sourceEvent) e = s;
            let rect = rootNode.getBoundingClientRect();
            return e.clientX - rect.left - rootNode.clientLeft;
        }
    }
} 