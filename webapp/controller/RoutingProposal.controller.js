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
                TotalProposed: "0"
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            // Try to get material from URL parameters
            var sMaterial = this._getMaterialFromURL();
            var sPlant = this._getPlantFromURL();
            
            // Fallback to default if not in URL
            if (!sMaterial) {
                sMaterial = "SG24";
            }
            if (!sPlant) {
                sPlant = "1010";
            }
            
            // Update view model
            oViewModel.setProperty("/Material", sMaterial);
            oViewModel.setProperty("/Plant", sPlant);
            
            // Load data after view is rendered
            var that = this;
            setTimeout(function() {
                that._loadMaterialData(sMaterial, sPlant);
            }, 500);
        },

        
        // Get material from URL query parameters
      
        _getMaterialFromURL: function () {
            var sHash = window.location.hash;
            
            // Try to extract material from hash
            // Format: #app-preview?material=123456
            var oParams = new URLSearchParams(sHash.split('?')[1]);
            return oParams.get('material') || oParams.get('Material');
        },

       
        // Get plant from URL query parameters
     
        _getPlantFromURL: function () {
            var sHash = window.location.hash;
            var oParams = new URLSearchParams(sHash.split('?')[1]);
            return oParams.get('plant') || oParams.get('Plant');
        },

        _loadMaterialData: function (sMaterial, sPlant) {
            var oTable = this.getView().byId("routingsTable");
            if (!oTable) {
                return;
            }
            
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                var aFilters = [];
                
                if (sMaterial) {
                    aFilters.push(new Filter("Material", FilterOperator.EQ, sMaterial));
                }
                
                if (sPlant) {
                    aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
                }
                
                oBinding.filter(aFilters);
            }
        },

        
        // Formatter: Calculate total from Setup + Machine + Labor (Planned)
        
        formatTotal: function (fSetup, fMachine, fLabor) {
            var fTotal = (parseFloat(fSetup) || 0) + 
                         (parseFloat(fMachine) || 0) + 
                         (parseFloat(fLabor) || 0);
            return fTotal.toFixed(2) + " min";
        },

  
         // Formatter: Calculate total from Proposed times
         // If no proposed values, return empty string (will show 0.00 min)
      
        formatProposedTotal: function (fSetup, fMachine, fLabor) {
            var fTotal = (parseFloat(fSetup) || 0) + 
                         (parseFloat(fMachine) || 0) + 
                         (parseFloat(fLabor) || 0);
            
            return fTotal.toFixed(2) + " min";
        },

     
         //Called when table finishes updating (data loaded)
      
        onTableUpdateFinished: function () {
            this._calculateGrandTotals();
        },

       
        //Calculate grand totals for footer
        
        _calculateGrandTotals: function () {
            var oTable = this.getView().byId("routingsTable");
            var aItems = oTable.getItems();
            var oViewModel = this.getView().getModel("viewModel");
            
            var fTotalPlanned = 0;
            var fTotalProposed = 0;
            
            aItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext();
                if (oContext) {
                    // Planned times
                    var fSetup = parseFloat(oContext.getProperty("SetupTime")) || 0;
                    var fMachine = parseFloat(oContext.getProperty("MachineTime")) || 0;
                    var fLabor = parseFloat(oContext.getProperty("LaborTime")) || 0;
                    fTotalPlanned += fSetup + fMachine + fLabor;
                    
                    // Proposed times
                    var fProposedSetup = parseFloat(oContext.getProperty("ProposedSetupTime")) || 0;
                    var fProposedMachine = parseFloat(oContext.getProperty("ProposedMachineTime")) || 0;
                    var fProposedLabor = parseFloat(oContext.getProperty("ProposedLaborTime")) || 0;
                    var fProposedTotal = fProposedSetup + fProposedMachine + fProposedLabor;
                    
                    // If no proposed values, use planned
                    if (fProposedTotal === 0) {
                        fProposedTotal = fSetup + fMachine + fLabor;
                    }
                    fTotalProposed += fProposedTotal;
                }
            });
            
            oViewModel.setProperty("/TotalPlanned", fTotalPlanned.toFixed(0));
            oViewModel.setProperty("/TotalProposed", fTotalProposed.toFixed(0));
        },

      
         //Handle proposed time changes
       
        onProposedTimeChange: function () {
            // Recalculate grand totals
            this._calculateGrandTotals();
        },

   
        // Save new routing times
       
        onSaveNewRoutingTimes: function () {
            var oTable = this.getView().byId("routingsTable");
            var aItems = oTable.getItems();
            var oModel = this.getOwnerComponent().getModel();
            
            // Check if any proposed values exist
            var bHasProposed = false;
            var aUpdates = [];
            
            aItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext();
                if (oContext) {
                    var fSetup = parseFloat(oContext.getProperty("ProposedSetupTime")) || 0;
                    var fMachine = parseFloat(oContext.getProperty("ProposedMachineTime")) || 0;
                    var fLabor = parseFloat(oContext.getProperty("ProposedLaborTime")) || 0;
                    
                    if (fSetup > 0 || fMachine > 0 || fLabor > 0) {
                        bHasProposed = true;
                        aUpdates.push({
                            path: oContext.getPath(),
                            data: {
                                ProposedSetupTime: fSetup,
                                ProposedMachineTime: fMachine,
                                ProposedLaborTime: fLabor
                            }
                        });
                    }
                }
            });
            
            if (!bHasProposed) {
                MessageBox.warning("Please enter at least one proposed time before saving.");
                return;
            }
            
            // Confirm save
            MessageBox.confirm(
                "Do you want to save " + aUpdates.length + " proposed routing time(s)?",
                {
                    title: "Confirm Save",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._performSave(aUpdates, oModel);
                        }
                    }.bind(this)
                }
            );
        },

      
        //  Perform save operation
        
        _performSave: function (aUpdates, oModel) {
            this.getView().setBusy(true);
            
            var iSuccess = 0;
            var iError = 0;
            var iTotal = aUpdates.length;
            
            aUpdates.forEach(function (oUpdate) {
                oModel.update(oUpdate.path, oUpdate.data, {
                    success: function () {
                        iSuccess++;
                        if (iSuccess + iError === iTotal) {
                            this._finishSave(iSuccess, iError);
                        }
                    }.bind(this),
                    error: function () {
                        iError++;
                        if (iSuccess + iError === iTotal) {
                            this._finishSave(iSuccess, iError);
                        }
                    }.bind(this)
                });
            }.bind(this));
        },

    
        // Finish save and show message
      
        _finishSave: function (iSuccess, iError) {
            this.getView().setBusy(false);
            
            if (iError === 0) {
                MessageToast.show("Successfully saved " + iSuccess + " routing time(s)!");
                
                // Refresh table
                var oTable = this.getView().byId("routingsTable");
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            } else {
                MessageBox.error("Saved " + iSuccess + " successfully, but " + iError + " failed.");
            }
        },

       
    // Navigate back
   
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