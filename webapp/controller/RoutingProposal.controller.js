sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, History, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("prodroutingmngfree.controller.RoutingProposal", {

        onInit: function () {
            // Initialize view model
            var oViewModel = new JSONModel({
                Material: "",
                Plant: "",
                TotalPlanned: "0",
                TotalProposed: "0",
                ViewMode: "table",
                CurrentOperationIndex: 0,
                TotalOperations: 0,
                OperationCounter: "",
                CurrentOperation: {},
                AllOperations: [],
                AcceptedAllApplied: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            var sMaterial = this._getMaterialFromURL();
            var sPlant = this._getPlantFromURL();
            
            if (!sMaterial) {
                sMaterial = "SG24";
            }
            if (!sPlant) {
                sPlant = "1010";
            }
            
            oViewModel.setProperty("/Material", sMaterial);
            oViewModel.setProperty("/Plant", sPlant);
            
            // Initialize mock data model
            this._initializeMockData(sMaterial, sPlant);
            
            var that = this;
            setTimeout(function() {
                that._loadMaterialData(sMaterial, sPlant);
            }, 500);
        },

        _initializeMockData: function(sMaterial, sPlant) {
            // Create mock data for demo
            var aMockData = [
                {
                    Material: sMaterial,
                    Plant: sPlant,
                    Operation: "0010",
                    OperationShortText: "Preparation and Setup",
                    SetupTime: 15.000,
                    SetupTimeUnit: "min",
                    MachineTime: 30.000,
                    MachineTimeUnit: "min",
                    LaborTime: 45.000,
                    LaborTimeUnit: "min",
                    ProposedSetupTimePH: 10.000,
                    ProposedMachineTimePH: 25.000,
                    ProposedLaborTimePH: 30.000,
                    ProposedSetupTime: null,
                    ProposedMachineTime: null,
                    ProposedLaborTime: null
                },
                {
                    Material: sMaterial,
                    Plant: sPlant,
                    Operation: "0020",
                    OperationShortText: "Material Cutting",
                    SetupTime: 10.000,
                    SetupTimeUnit: "min",
                    MachineTime: 60.000,
                    MachineTimeUnit: "min",
                    LaborTime: 20.000,
                    LaborTimeUnit: "min",
                    ProposedSetupTimePH: 12.000,
                    ProposedMachineTimePH: 55.000,
                    ProposedLaborTimePH: 15.000,
                    ProposedSetupTime: null,
                    ProposedMachineTime: null,
                    ProposedLaborTime: null
                },
                {
                    Material: sMaterial,
                    Plant: sPlant,
                    Operation: "0030",
                    OperationShortText: "Assembly",
                    SetupTime: 5.000,
                    SetupTimeUnit: "min",
                    MachineTime: 45.000,
                    MachineTimeUnit: "min",
                    LaborTime: 90.000,
                    LaborTimeUnit: "min",
                    ProposedSetupTimePH: 7.000,
                    ProposedMachineTimePH: 40.000,
                    ProposedLaborTimePH: 85.000,
                    ProposedSetupTime: null,
                    ProposedMachineTime: null,
                    ProposedLaborTime: null
                },
                {
                    Material: sMaterial,
                    Plant: sPlant,
                    Operation: "0040",
                    OperationShortText: "Quality Inspection",
                    SetupTime: 0.000,
                    SetupTimeUnit: "min",
                    MachineTime: 15.000,
                    MachineTimeUnit: "min",
                    LaborTime: 30.000,
                    LaborTimeUnit: "min",
                    ProposedSetupTimePH: 0.000,
                    ProposedMachineTimePH: 10.000,
                    ProposedLaborTimePH: 25.000,
                    ProposedSetupTime: null,
                    ProposedMachineTime: null,
                    ProposedLaborTime: null
                }
            ];

            // Create mock OData model
            var oMockModel = new JSONModel({
                Z_POC_C_ROUTING_ACTL_TIME: aMockData
            });
            
            this.getView().setModel(oMockModel);
        },

        onAfterRendering: function() {
            this._attachSelectOnFocusHandlers();
        },

        _attachSelectOnFocusHandlers: function() {
            var oView = this.getView();
            var aInputs = [];
            
            // Table view inputs
            var oTable = oView.byId("routingsTable");
            if (oTable) {
                var aTableInputs = oTable.findAggregatedObjects(true, function(oControl) {
                    return oControl.isA("sap.m.Input") && 
                           oControl.data("selectOnFocus") === "true";
                });
                aInputs = aInputs.concat(aTableInputs);
            }
            
            // Single view inputs
            ["setupInput", "machineInput", "laborInput"].forEach(function(sInputId) {
                var oInput = oView.byId(sInputId);
                if (oInput && oInput.data("selectOnFocus") === "true") {
                    aInputs.push(oInput);
                }
            });
            
            // Attach focus event handler to each input
            aInputs.forEach(function(oInput) {
                oInput.$().off("focus");
                
                oInput.$().on("focus", function() {
                    setTimeout(function() {
                        if (oInput.getDOMRef()) {
                            var oInputDomRef = oInput.getFocusDomRef();
                            if (oInputDomRef) {
                                oInputDomRef.select();
                            }
                        }
                    }, 50);
                });
            });
        },

        // _getMaterialFromURL: function () {
        //     var sHash = window.location.hash;
        //     var oParams = new URLSearchParams(sHash.split('?')[1]);
        //     return oParams.get('material') || oParams.get('Material');
        // },

        // _getPlantFromURL: function () {
        //     var sHash = window.location.hash;
        //     var oParams = new URLSearchParams(sHash.split('?')[1]);
        //     return oParams.get('plant') || oParams.get('Plant');
        // },

        _getMaterialFromURL: function () {
            // Try SAP Fiori Launchpad way first
            try {
                var oComponentData = this.getOwnerComponent().getComponentData();
                if (oComponentData && oComponentData.startupParameters) {
                    var oParams = oComponentData.startupParameters;
                    var sMaterial = oParams.material && oParams.material[0] 
                                || oParams.Material && oParams.Material[0];
                    if (sMaterial) return sMaterial;
                }
            } catch (e) {}

            // Fallback: parse hash (local / direct URL)
            var sHash = window.location.hash;
            var sSearch = sHash.includes('?') ? sHash.split('?')[1] : window.location.search.substring(1);
            var oParams = new URLSearchParams(sSearch);
            return oParams.get('material') || oParams.get('Material');
        },

        _getPlantFromURL: function () {
            try {
                var oComponentData = this.getOwnerComponent().getComponentData();
                if (oComponentData && oComponentData.startupParameters) {
                    var oParams = oComponentData.startupParameters;
                    var sPlant = oParams.plant && oParams.plant[0] 
                            || oParams.Plant && oParams.Plant[0];
                    if (sPlant) return sPlant;
                }
            } catch (e) {}

            var sHash = window.location.hash;
            var sSearch = sHash.includes('?') ? sHash.split('?')[1] : window.location.search.substring(1);
            var oParams = new URLSearchParams(sSearch);
            return oParams.get('plant') || oParams.get('Plant');
        },

        _loadMaterialData: function (sMaterial, sPlant) {
            var oTable = this.getView().byId("routingsTable");
            if (!oTable) {
                return;
            }
            
            // For mock data, we don't need to filter as data is already filtered
            // Just refresh the binding
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        formatTotal: function (fSetup, fMachine, fLabor) {
            var fTotal = (parseFloat(fSetup) || 0) + 
                         (parseFloat(fMachine) || 0) + 
                         (parseFloat(fLabor) || 0);
            return fTotal.toFixed(2) + " min";
        },

        formatProposedTotal: function (fSetup, fMachine, fLabor) {
            var fTotal = (parseFloat(fSetup) || 0) + 
                         (parseFloat(fMachine) || 0) + 
                         (parseFloat(fLabor) || 0);
            
            // Only show if there are proposed values, otherwise return empty
            if (fTotal > 0) {
                return fTotal.toFixed(2) + " min";
            }
            return "0.00 min";
        },

        formatCurrentOperationTotal: function (fSetup, fMachine, fLabor) {
            var fTotal = (parseFloat(fSetup) || 0) + 
                         (parseFloat(fMachine) || 0) + 
                         (parseFloat(fLabor) || 0);
            
            return fTotal.toFixed(0) + " min";
        },

        onTableUpdateFinished: function () {
            this._calculateGrandTotals();
            this._loadAllOperations();
        },

        _loadAllOperations: function() {
            var oTable = this.getView().byId("routingsTable");
            var aItems = oTable.getItems();
            var oViewModel = this.getView().getModel("viewModel");
            var aOperations = [];
            
            aItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext();
                if (oContext) {
                    aOperations.push(oContext.getObject());
                }
            });
            
            oViewModel.setProperty("/AllOperations", aOperations);
            oViewModel.setProperty("/TotalOperations", aOperations.length);
            
            if (aOperations.length > 0) {
                // Preserve current index if it exists, otherwise default to 0
                var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
                if (iCurrentIndex === undefined || iCurrentIndex === null || iCurrentIndex >= aOperations.length) {
                    iCurrentIndex = 0;
                }
                this._setCurrentOperation(iCurrentIndex);
            }
        },

        
        _onRevertAllProposedTimes: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oModel = this.getView().getModel();

            // Get all operations
            var aOperations = oViewModel.getProperty("/AllOperations") || [];

            aOperations.forEach(function (oOp) {
                oOp.ProposedSetupTime = null;
                oOp.ProposedMachineTime = null;
                oOp.ProposedLaborTime = null;
            });

            // Update the model
            oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aOperations);
            oViewModel.setProperty("/AllOperations", aOperations);
            oViewModel.setProperty("/AcceptedAllApplied", false);

            // Refresh Single View: reload the current operation
            var iIndex = oViewModel.getProperty("/CurrentOperationIndex");
            this._setCurrentOperation(iIndex);

            // Refresh totals
            this._calculateGrandTotals();

            sap.m.MessageToast.show("All proposed times were cleared.");
        },


        _setCurrentOperation: function(iIndex) {
            var oViewModel = this.getView().getModel("viewModel");
            var aOperations = oViewModel.getProperty("/AllOperations");
            
            if (iIndex >= 0 && iIndex < aOperations.length) {
                var oCurrentOp = aOperations[iIndex];
                
                // Create a copy to avoid modifying the original
                var oCurrentOpCopy = Object.assign({}, oCurrentOp);
                
                // Clear proposed values so placeholder shows instead
                // oCurrentOpCopy.ProposedSetupTime = null;
                // oCurrentOpCopy.ProposedMachineTime = null;
                // oCurrentOpCopy.ProposedLaborTime = null;
                
                oViewModel.setProperty("/CurrentOperationIndex", iIndex);
                oViewModel.setProperty("/CurrentOperation", oCurrentOpCopy);
                oViewModel.setProperty("/OperationCounter", (iIndex + 1) + " of " + aOperations.length);
                
                
                // Update placeholders to show the planned values
                var oSetupInput = this.getView().byId("setupInput");
                var oMachineInput = this.getView().byId("machineInput");
                var oLaborInput = this.getView().byId("laborInput");
                
                if (oSetupInput) {
                    oSetupInput.setPlaceholder((oCurrentOp.ProposedSetupTimePH || 0).toFixed(3));
                }
                if (oMachineInput) {
                    oMachineInput.setPlaceholder((oCurrentOp.ProposedMachineTimePH || 0).toFixed(3));
                }
                if (oLaborInput) {
                    oLaborInput.setPlaceholder((oCurrentOp.ProposedLaborTimePH || 0).toFixed(3));
                }
            }
        },

        _calculateGrandTotals: function () {
            var oTable = this.getView().byId("routingsTable");
            var aItems = oTable.getItems();
            var oViewModel = this.getView().getModel("viewModel");
            
            var fTotalPlanned = 0;
            var fTotalProposed = 0;
            
            aItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext();
                if (oContext) {
                    var fSetup = parseFloat(oContext.getProperty("SetupTime")) || 0;
                    var fMachine = parseFloat(oContext.getProperty("MachineTime")) || 0;
                    var fLabor = parseFloat(oContext.getProperty("LaborTime")) || 0;
                    fTotalPlanned += fSetup + fMachine + fLabor;
                    
                    var fProposedSetup = parseFloat(oContext.getProperty("ProposedSetupTime")) || 0;
                    var fProposedMachine = parseFloat(oContext.getProperty("ProposedMachineTime")) || 0;
                    var fProposedLabor = parseFloat(oContext.getProperty("ProposedLaborTime")) || 0;
                    var fProposedTotal = fProposedSetup + fProposedMachine + fProposedLabor;
                    
                    if (fProposedTotal === 0) {
                        fProposedTotal = fSetup + fMachine + fLabor;
                    }
                    fTotalProposed += fProposedTotal;
                }
            });
            
            oViewModel.setProperty("/TotalPlanned", fTotalPlanned.toFixed(0));
            oViewModel.setProperty("/TotalProposed", fTotalProposed.toFixed(0));
        },

        onProposedTimeChange: function (oEvent) {
            // The model is automatically updated via binding
            // Just recalculate totals
            this._calculateGrandTotals();
        },

        onSingleViewTimeChange: function(oEvent) {
            var oInput = oEvent.getSource();
            var sTimeType = oInput.data("timeType");
            var fNewValue = parseFloat(oInput.getValue()) || 0;
            
            var oViewModel = this.getView().getModel("viewModel");
            var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
            var aOperations = oViewModel.getProperty("/AllOperations");
            
            // Update the operation in the array
            if (aOperations[iCurrentIndex]) {
                aOperations[iCurrentIndex][sTimeType] = fNewValue;
                oViewModel.setProperty("/AllOperations", aOperations);
                
                // Update the mock model
                var oModel = this.getView().getModel();
                var aMockData = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
                if (aMockData[iCurrentIndex]) {
                    aMockData[iCurrentIndex][sTimeType] = fNewValue;
                    oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aMockData);
                }
                
                // Recalculate totals
                this._calculateGrandTotals();
            }
        },

        onAcceptPlannedTimes: function() {
            var oViewModel = this.getView().getModel("viewModel");
            var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
            var oCurrentOp = oViewModel.getProperty("/CurrentOperation");
            
            // Get the planned times
            var fSetupTime = parseFloat(oCurrentOp.SetupTime) || 0;
            var fMachineTime = parseFloat(oCurrentOp.MachineTime) || 0;
            var fLaborTime = parseFloat(oCurrentOp.LaborTime) || 0;
            
            // Update the mock model first (this is the source of truth)
            var oModel = this.getView().getModel();
            var aMockData = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
            if (aMockData[iCurrentIndex]) {
                aMockData[iCurrentIndex].ProposedSetupTime = fSetupTime;
                aMockData[iCurrentIndex].ProposedMachineTime = fMachineTime;
                aMockData[iCurrentIndex].ProposedLaborTime = fLaborTime;
                oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aMockData);
            }
            
            // Update the view model CurrentOperation
            oViewModel.setProperty("/CurrentOperation/ProposedSetupTime", fSetupTime);
            oViewModel.setProperty("/CurrentOperation/ProposedMachineTime", fMachineTime);
            oViewModel.setProperty("/CurrentOperation/ProposedLaborTime", fLaborTime);
            
            
            // Update AllOperations array
            var aOperations = oViewModel.getProperty("/AllOperations");
            if (aOperations[iCurrentIndex]) {
                aOperations[iCurrentIndex].ProposedSetupTime = fSetupTime;
                aOperations[iCurrentIndex].ProposedMachineTime = fMachineTime;
                aOperations[iCurrentIndex].ProposedLaborTime = fLaborTime;
                oViewModel.setProperty("/AllOperations", aOperations);
            }
            
            // Recalculate totals
            this._calculateGrandTotals();
            
            MessageToast.show("Planned times accepted for Operation " + oCurrentOp.Operation);
        },

        onAcceptAllPlannedTimes: function() {
            var oModel = this.getView().getModel();
            var aMockData = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
            
            // Update all operations with their planned times
            var iUpdated = 0;
            aMockData.forEach(function(oOperation) {
                oOperation.ProposedSetupTime = parseFloat(oOperation.ProposedSetupTimePH) || 0;
                oOperation.ProposedMachineTime = parseFloat(oOperation.ProposedMachineTimePH) || 0;
                oOperation.ProposedLaborTime = parseFloat(oOperation.ProposedLaborTimePH) || 0;
                iUpdated++;
            });
            
            // Update the model
            oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aMockData);
            
            // Update AllOperations in view model
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/AllOperations", aMockData);
            
            // Update current operation if in single view
            var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
            if (iCurrentIndex >= 0 && iCurrentIndex < aMockData.length) {
                var oCurrentOp = aMockData[iCurrentIndex];
                oViewModel.setProperty("/CurrentOperation/ProposedSetupTime", oCurrentOp.ProposedSetupTime);
                oViewModel.setProperty("/CurrentOperation/ProposedMachineTime", oCurrentOp.ProposedMachineTime);
                oViewModel.setProperty("/CurrentOperation/ProposedLaborTime", oCurrentOp.ProposedLaborTime);
                oViewModel.setProperty("/AcceptedAllApplied", true);
            }
            
            // if (iCurrentIndex >= 0 && iCurrentIndex < aMockData.length) {
            //     this._setCurrentOperation(iCurrentIndex); // << Reload clean & correct view model copy
            // }

            // Recalculate totals
            this._calculateGrandTotals();
            
            MessageToast.show("Planned times accepted for all " + iUpdated + " operations");
        },

        onViewModeChange: function(oEvent) {
            var sNewMode = oEvent.getParameter("key");
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/ViewMode", sNewMode);
            
            var that = this;
            setTimeout(function() {
                that._attachSelectOnFocusHandlers();
            }, 100);
        },

        onPreviousOperation: function() {
            var oViewModel = this.getView().getModel("viewModel");
            var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
            
            if (iCurrentIndex > 0) {
                this._setCurrentOperation(iCurrentIndex - 1);
                this._attachSelectOnFocusHandlers();
            }
        },

        onNextOperation: function() {
            var oViewModel = this.getView().getModel("viewModel");
            var iCurrentIndex = oViewModel.getProperty("/CurrentOperationIndex");
            var iTotalOperations = oViewModel.getProperty("/TotalOperations");
            
            if (iCurrentIndex < iTotalOperations - 1) {
                this._setCurrentOperation(iCurrentIndex + 1);
                this._attachSelectOnFocusHandlers();
            }
        },

        onSaveNewRoutingTimes: function () {
            var oModel = this.getView().getModel();
            var aMockData = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
            var oViewModel = this.getView().getModel("viewModel");
            var sMaterial = oViewModel.getProperty("/Material");
            
            var bHasProposed = false;
            var iUpdates = 0;
            
            aMockData.forEach(function (oOperation) {
                var fSetup = parseFloat(oOperation.ProposedSetupTime) || 0;
                var fMachine = parseFloat(oOperation.ProposedMachineTime) || 0;
                var fLabor = parseFloat(oOperation.ProposedLaborTime) || 0;
                
                if (fSetup > 0 || fMachine > 0 || fLabor > 0) {
                    bHasProposed = true;
                    iUpdates++;
                }
            });
            
            if (!bHasProposed) {
                MessageBox.warning("Please enter at least one proposed time before saving.");
                return;
            }
            
            MessageBox.confirm(
                "Do you want to save " + iUpdates + " proposed routing time(s)?",
                {
                    title: "Confirm Save",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._performSave(sMaterial, iUpdates);
                        }
                    }.bind(this)
                }
            );
        },

        _performSave: function (sMaterial, iUpdates) {
            this.getView().setBusy(true);
            
            // Simulate backend call
            setTimeout(function() {
                this.getView().setBusy(false);
                
                MessageBox.success(
                    "Routing values for material " + sMaterial + " were updated successfully!\n\n" +
                    iUpdates + " operation(s) updated.",
                    {
                        title: "Success"
                    }
                );
                
                // Refresh the table
                var oTable = this.getView().byId("routingsTable");
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }.bind(this), 1000);
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview", {}, true);
            }
        }

    });
});