sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, History, JSONModel, MessageBox, MessageToast) {
    "use strict";

    var ALL_DATA = [
        { Material: "20021484", MaterialName: "HF-Stator SP 400-440.4", Activity: "0030", ActivityName: "Achtung! Vorgabezeiten neu aufnehmen",    PlanMachine: 1363, RecommendedMachine: 937,  PlanLabor: 1363, RecommendedLabor: 937  },
        { Material: "20021484", MaterialName: "HF-Stator SP 400-440.4", Activity: "0060", ActivityName: "Stator verharzen",                         PlanMachine: 447,  RecommendedMachine: 235,  PlanLabor: 379,  RecommendedLabor: 205  },
        { Material: "20021484", MaterialName: "HF-Stator SP 400-440.4", Activity: "0100", ActivityName: "Achtung! Vorgabezeiten neu aufnehmen",     PlanMachine: 117,  RecommendedMachine: 63,   PlanLabor: 117,  RecommendedLabor: 63   },
        { Material: "20022031", MaterialName: "Stator SP 300-360.4",    Activity: "0030", ActivityName: "Stator kpl. isolieren, Feldspulen mit Ph", PlanMachine: 2393, RecommendedMachine: 1693, PlanLabor: 2393, RecommendedLabor: 1693 },
        { Material: "20022031", MaterialName: "Stator SP 300-360.4",    Activity: "0040", ActivityName: "Stator schalten Teil 1",                   PlanMachine: 1640, RecommendedMachine: 1640, PlanLabor: 1640, RecommendedLabor: 1640 },
        { Material: "20022031", MaterialName: "Stator SP 300-360.4",    Activity: "0050", ActivityName: "Wickelköpfe von Stator formen",            PlanMachine: 1080, RecommendedMachine: 1080, PlanLabor: 1080, RecommendedLabor: 1080 },
        { Material: "20022031", MaterialName: "Stator SP 300-360.4",    Activity: "0070", ActivityName: "Stator verharzen",                         PlanMachine: 240,  RecommendedMachine: 200,  PlanLabor: 240,  RecommendedLabor: 200  },
        { Material: "20030277", MaterialName: "Stator SP 200-350. 4",   Activity: "0010", ActivityName: "Feldspulen wickeln nach Vorgabe Entwickl", PlanMachine: 1800, RecommendedMachine: 1170, PlanLabor: 1800, RecommendedLabor: 1170 },
        { Material: "20030277", MaterialName: "Stator SP 200-350. 4",   Activity: "0020", ActivityName: "Teile n. Zeichnung u. Stückliste kommiss", PlanMachine: 200,  RecommendedMachine: 160,  PlanLabor: 200,  RecommendedLabor: 160  },
        { Material: "20030277", MaterialName: "Stator SP 200-350. 4",   Activity: "0050", ActivityName: "Stator in Statorgehäuse Pos210 einschrum", PlanMachine: 60,   RecommendedMachine: 60,   PlanLabor: 60,   RecommendedLabor: 60   },
        { Material: "20030277", MaterialName: "Stator SP 200-350. 4",   Activity: "0080", ActivityName: "Stator entformen u. Vergussform reinigen", PlanMachine: 60,   RecommendedMachine: 30,   PlanLabor: 60,   RecommendedLabor: 30   },
        { Material: "20030277", MaterialName: "Stator SP 200-350. 4",   Activity: "0110", ActivityName: "Endprüfung nach PAN u. kpl. verpacken",    PlanMachine: 120,  RecommendedMachine: 60,   PlanLabor: 120,  RecommendedLabor: 60   }
       
    ];

    // Derive unique materials list for the Select control
    var MATERIALS = (function () {
        var seen = {};
        var result = [];
        ALL_DATA.forEach(function (o) {
            if (!seen[o.Material]) {
                seen[o.Material] = true;
                result.push({ Material: o.Material, MaterialName: o.MaterialName, Label: o.Material + " – " + o.MaterialName });
            }
        });
        return result;
    }());

    return Controller.extend("prodroutingmngfree.controller.RoutingProposal", {

        onInit: function () {
            var oViewModel = new JSONModel({
                Material: "",
                MaterialName: "",
                Plant: "",
                TotalPlanned: "0",
                TotalProposed: "0",
                ViewMode: "table",
                CurrentOperationIndex: 0,
                TotalOperations: 0,
                OperationCounter: "",
                CurrentOperation: {},
                AllOperations: [],
                AcceptedAllApplied: false,
                Materials: MATERIALS          // list for the Select
            });
            this.getView().setModel(oViewModel, "viewModel");

            var sMaterial = this._getMaterialFromURL();
            var sPlant    = this._getPlantFromURL();
            if (!sMaterial) { sMaterial = MATERIALS[0].Material; }
            if (!sPlant)    { sPlant    = "1010"; }

            oViewModel.setProperty("/Plant", sPlant);
            this._loadMaterial(sMaterial, sPlant);
        },

        // ─── Material switch ─────────────────────────────────────────────────────

        /** Called when the user picks a different material in the Select */
        onMaterialChange: function (oEvent) {
            var sMaterial  = oEvent.getParameter("selectedItem").getKey();
            var sPlant     = this.getView().getModel("viewModel").getProperty("/Plant");
            this._loadMaterial(sMaterial, sPlant);
        },

        /** Central method: reset everything and load data for the given material */
        _loadMaterial: function (sMaterial, sPlant) {
            var oViewModel = this.getView().getModel("viewModel");

            // Reset state
            oViewModel.setProperty("/Material",              sMaterial);
            oViewModel.setProperty("/Plant",                 sPlant);
            oViewModel.setProperty("/AcceptedAllApplied",    false);
            oViewModel.setProperty("/CurrentOperationIndex", 0);
            oViewModel.setProperty("/AllOperations",         []);
            oViewModel.setProperty("/CurrentOperation",      {});
            oViewModel.setProperty("/TotalPlanned",          "0");
            oViewModel.setProperty("/TotalProposed",         "0");

            this._initializeDataForMaterial(sMaterial, sPlant);

            var that = this;
            setTimeout(function () { that._refreshTable(); }, 300);
        },

        _initializeDataForMaterial: function (sMaterial, sPlant) {
            var aFiltered = ALL_DATA
                .filter(function (o) { return o.Material === sMaterial; })
                .map(function (o) {
                    return Object.assign({}, o, {
                        Plant: sPlant,
                        ProposedMachineTime: null,
                        ProposedLaborTime:   null
                    });
                });

            var sMatName = aFiltered.length > 0 ? aFiltered[0].MaterialName : "";
            this.getView().getModel("viewModel").setProperty("/MaterialName", sMatName);

            this.getView().setModel(new JSONModel({ Z_POC_C_ROUTING_ACTL_TIME: aFiltered }));
        },

        _refreshTable: function () {
            var oTable = this.getView().byId("routingsTable");
            if (!oTable) { return; }
            var oBinding = oTable.getBinding("items");
            if (oBinding) { oBinding.refresh(); }
        },

        // ─── URL params ──────────────────────────────────────────────────────────

        _getMaterialFromURL: function () {
            try {
                var oCP = this.getOwnerComponent().getComponentData();
                if (oCP && oCP.startupParameters) {
                    var v = (oCP.startupParameters.material && oCP.startupParameters.material[0])
                         || (oCP.startupParameters.Material && oCP.startupParameters.Material[0]);
                    if (v) return v;
                }
            } catch (e) {}
            var sSearch = window.location.hash.includes("?")
                ? window.location.hash.split("?")[1] : window.location.search.substring(1);
            return new URLSearchParams(sSearch).get("material") || new URLSearchParams(sSearch).get("Material");
        },

        _getPlantFromURL: function () {
            try {
                var oCP = this.getOwnerComponent().getComponentData();
                if (oCP && oCP.startupParameters) {
                    var v = (oCP.startupParameters.plant && oCP.startupParameters.plant[0])
                         || (oCP.startupParameters.Plant && oCP.startupParameters.Plant[0]);
                    if (v) return v;
                }
            } catch (e) {}
            var sSearch = window.location.hash.includes("?")
                ? window.location.hash.split("?")[1] : window.location.search.substring(1);
            return new URLSearchParams(sSearch).get("plant") || new URLSearchParams(sSearch).get("Plant");
        },

        // ─── Formatters ──────────────────────────────────────────────────────────

        formatTotal: function (fMachine, fLabor) {
            return ((parseFloat(fMachine) || 0) + (parseFloat(fLabor) || 0)).toFixed(2) + " min";
        },

        formatProposedTotal: function (fPropM, fPropL, fRecM, fRecL) {
            var fM = (fPropM !== null && fPropM !== undefined && fPropM !== "") ? parseFloat(fPropM) : (parseFloat(fRecM) || 0);
            var fL = (fPropL !== null && fPropL !== undefined && fPropL !== "") ? parseFloat(fPropL) : (parseFloat(fRecL) || 0);
            return (fM + fL).toFixed(2) + " min";
        },

        formatCurrentOperationTotal: function (fMachine, fLabor) {
            return ((parseFloat(fMachine) || 0) + (parseFloat(fLabor) || 0)).toFixed(0) + " min";
        },

        // ─── Table events ────────────────────────────────────────────────────────

        onTableUpdateFinished: function () {
            this._calculateGrandTotals();
            this._loadAllOperations();
        },

        _loadAllOperations: function () {
            var oTable      = this.getView().byId("routingsTable");
            var oViewModel  = this.getView().getModel("viewModel");
            var aOperations = [];

            oTable.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (oCtx) { aOperations.push(oCtx.getObject()); }
            });

            oViewModel.setProperty("/AllOperations",   aOperations);
            oViewModel.setProperty("/TotalOperations", aOperations.length);

            if (aOperations.length > 0) {
                var iIdx = oViewModel.getProperty("/CurrentOperationIndex") || 0;
                if (iIdx >= aOperations.length) { iIdx = 0; }
                this._setCurrentOperation(iIdx);
            }
        },

        _setCurrentOperation: function (iIndex) {
            var oViewModel  = this.getView().getModel("viewModel");
            var aOperations = oViewModel.getProperty("/AllOperations");

            if (iIndex >= 0 && iIndex < aOperations.length) {
                var oOp = aOperations[iIndex];
                oViewModel.setProperty("/CurrentOperationIndex", iIndex);
                oViewModel.setProperty("/CurrentOperation",      Object.assign({}, oOp));
                oViewModel.setProperty("/OperationCounter",      (iIndex + 1) + " of " + aOperations.length);

                var oMachineInput = this.getView().byId("machineInput");
                var oLaborInput   = this.getView().byId("laborInput");
                if (oMachineInput) { oMachineInput.setPlaceholder(String(oOp.RecommendedMachine || 0)); }
                if (oLaborInput)   { oLaborInput.setPlaceholder(  String(oOp.RecommendedLabor   || 0)); }
            }
        },

        _calculateGrandTotals: function () {
            var oTable     = this.getView().byId("routingsTable");
            var oViewModel = this.getView().getModel("viewModel");
            var fPlanned   = 0;
            var fProposed  = 0;

            oTable.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext();
                if (!oCtx) { return; }
                fPlanned  += (parseFloat(oCtx.getProperty("PlanMachine")) || 0)
                           + (parseFloat(oCtx.getProperty("PlanLabor"))   || 0);
                var fPM = oCtx.getProperty("ProposedMachineTime");
                var fPL = oCtx.getProperty("ProposedLaborTime");
                fProposed +=
                    ((fPM !== null && fPM !== undefined && fPM !== "") ? parseFloat(fPM) : (parseFloat(oCtx.getProperty("RecommendedMachine")) || 0))
                  + ((fPL !== null && fPL !== undefined && fPL !== "") ? parseFloat(fPL) : (parseFloat(oCtx.getProperty("RecommendedLabor"))   || 0));
            });

            oViewModel.setProperty("/TotalPlanned",  fPlanned.toFixed(0));
            oViewModel.setProperty("/TotalProposed", fProposed.toFixed(0));
        },

        // ─── Input changes ───────────────────────────────────────────────────────

        onProposedTimeChange: function () {
            this._calculateGrandTotals();
        },

        onSingleViewTimeChange: function (oEvent) {
            var oInput    = oEvent.getSource();
            var sTimeType = oInput.data("timeType");
            var fNewValue = parseFloat(oInput.getValue()) || 0;

            var oViewModel  = this.getView().getModel("viewModel");
            var iIdx        = oViewModel.getProperty("/CurrentOperationIndex");
            var aOperations = oViewModel.getProperty("/AllOperations");

            if (aOperations[iIdx]) {
                aOperations[iIdx][sTimeType] = fNewValue;
                oViewModel.setProperty("/AllOperations", aOperations);
                var oModel = this.getView().getModel();
                var aData  = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
                if (aData[iIdx]) {
                    aData[iIdx][sTimeType] = fNewValue;
                    oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aData);
                }
                this._calculateGrandTotals();
            }
        },

        // ─── Accept / Revert ─────────────────────────────────────────────────────

        onAcceptAllPlannedTimes: function () {
            var oModel    = this.getView().getModel();
            var aData     = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
            var iUpdated  = 0;

            aData.forEach(function (oOp) {
                oOp.ProposedMachineTime = parseFloat(oOp.RecommendedMachine) || 0;
                oOp.ProposedLaborTime   = parseFloat(oOp.RecommendedLabor)   || 0;
                iUpdated++;
            });
            oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aData);

            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/AllOperations",      aData);
            oViewModel.setProperty("/AcceptedAllApplied", true);

            var iIdx = oViewModel.getProperty("/CurrentOperationIndex");
            if (iIdx >= 0 && iIdx < aData.length) {
                oViewModel.setProperty("/CurrentOperation/ProposedMachineTime", aData[iIdx].ProposedMachineTime);
                oViewModel.setProperty("/CurrentOperation/ProposedLaborTime",   aData[iIdx].ProposedLaborTime);
            }
            this._calculateGrandTotals();
            MessageToast.show("Recommended times accepted for all " + iUpdated + " operations");
        },

        _onRevertAllProposedTimes: function () {
            var oViewModel  = this.getView().getModel("viewModel");
            var oModel      = this.getView().getModel();
            var aOperations = oViewModel.getProperty("/AllOperations") || [];

            aOperations.forEach(function (oOp) {
                oOp.ProposedMachineTime = null;
                oOp.ProposedLaborTime   = null;
            });
            oModel.setProperty("/Z_POC_C_ROUTING_ACTL_TIME", aOperations);
            oViewModel.setProperty("/AllOperations",      aOperations);
            oViewModel.setProperty("/AcceptedAllApplied", false);

            this._setCurrentOperation(oViewModel.getProperty("/CurrentOperationIndex"));
            this._calculateGrandTotals();
            MessageToast.show("All proposed times were cleared.");
        },

        // ─── Navigation ──────────────────────────────────────────────────────────

        onViewModeChange: function (oEvent) {
            this.getView().getModel("viewModel").setProperty("/ViewMode", oEvent.getParameter("key"));
            var that = this;
            setTimeout(function () { that._attachSelectOnFocusHandlers(); }, 100);
        },

        onPreviousOperation: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var iIdx = oViewModel.getProperty("/CurrentOperationIndex");
            if (iIdx > 0) { this._setCurrentOperation(iIdx - 1); this._attachSelectOnFocusHandlers(); }
        },

        onNextOperation: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var iIdx   = oViewModel.getProperty("/CurrentOperationIndex");
            var iTotal = oViewModel.getProperty("/TotalOperations");
            if (iIdx < iTotal - 1) { this._setCurrentOperation(iIdx + 1); this._attachSelectOnFocusHandlers(); }
        },

        // ─── Save ────────────────────────────────────────────────────────────────

        onSaveNewRoutingTimes: function () {
            var oModel    = this.getView().getModel();
            var aData     = oModel.getProperty("/Z_POC_C_ROUTING_ACTL_TIME");
            var sMaterial = this.getView().getModel("viewModel").getProperty("/Material");
            var bHas      = false;
            var iUpdates  = 0;

            aData.forEach(function (oOp) {
                if ((parseFloat(oOp.ProposedMachineTime) || 0) > 0 || (parseFloat(oOp.ProposedLaborTime) || 0) > 0) {
                    bHas = true; iUpdates++;
                }
            });

            if (!bHas) { MessageBox.warning("Please enter at least one proposed time before saving."); return; }

            MessageBox.confirm("Do you want to save " + iUpdates + " proposed routing time(s)?", {
                title: "Confirm Save",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) { this._performSave(sMaterial, iUpdates); }
                }.bind(this)
            });
        },

        _performSave: function (sMaterial, iUpdates) {
            this.getView().setBusy(true);
            setTimeout(function () {
                this.getView().setBusy(false);
                MessageBox.success(
                    "Routing values for material " + sMaterial + " were updated successfully!\n\n" + iUpdates + " operation(s) updated.",
                    { title: "Success" }
                );
                var oBinding = this.getView().byId("routingsTable").getBinding("items");
                if (oBinding) { oBinding.refresh(); }
            }.bind(this), 1000);
        },

        // ─── Focus helpers ───────────────────────────────────────────────────────

        onAfterRendering: function () {
            this._attachSelectOnFocusHandlers();
        },

        _attachSelectOnFocusHandlers: function () {
            var oView   = this.getView();
            var aInputs = [];
            var oTable  = oView.byId("routingsTable");
            if (oTable) {
                aInputs = aInputs.concat(oTable.findAggregatedObjects(true, function (oCtrl) {
                    return oCtrl.isA("sap.m.Input") && oCtrl.data("selectOnFocus") === "true";
                }));
            }
            ["machineInput", "laborInput"].forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.data("selectOnFocus") === "true") { aInputs.push(oInput); }
            });
            aInputs.forEach(function (oInput) {
                oInput.$().off("focus").on("focus", function () {
                    setTimeout(function () {
                        var oDom = oInput.getFocusDomRef && oInput.getFocusDomRef();
                        if (oDom) { oDom.select(); }
                    }, 50);
                });
            });
        },

        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) { window.history.go(-1); }
            else { this.getOwnerComponent().getRouter().navTo("overview", {}, true); }
        }
    });
});