/*global QUnit*/

sap.ui.define([
	"prodroutingmngfree/controller/RoutingProposal.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RoutingProposal Controller");

	QUnit.test("I should test the RoutingProposal controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
