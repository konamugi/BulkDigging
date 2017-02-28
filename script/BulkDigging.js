/*
 * Bulk Digging 0.2.0
 * Copyright (c) 2016 konamugi All Rights Reserved.
 * 
 * This program is free software; you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the 
 * Free Software Foundation; either version 3 of the License, or (at your 
 * option) any later version.
 * 
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY 
 * or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License 
 * for more details.
 * 
 * You should have received a copy of the GNU General Public License along 
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */


/** 一括削除有効/無効 */
var burstMode=true;
var range = 2;
var debugMode=false;
var safeMode=true;


/** burstする条件SlotID */
var targetSlot=[7,8];

// Range Limitter
var MAX_RANGE = 5;

var strategy;

var Categories;
var TargetMapping;
var BCGlobal;
var ignoreBlocks;
function init() {
	strategy = DestroyGroupBlockStrategy;
	Categories = {
			tools:{
				pickaxe:[Item.wooden_pickaxe,Item.stone_pickaxe,Item.iron_pickaxe,Item.golden_pickaxe,Item.diamond_pickaxe],
				shovel:[Item.wooden_shovel,Item.stone_shovel,Item.iron_shovel,Item.golden_shovel,Item.diamond_shovel]
			},
			blocksBreakWith:{
				pickaxe:[],
				shovel:[]
				
			}

	};
	

	for (var name in Block) {
		block = Block[name];
		if (block.tool == BCStatics.pickaxe) {
			Categories.blocksBreakWith.pickaxe.push(block);
		} else if (block.tool == BCStatics.shovel) {
			Categories.blocksBreakWith.shovel.push(block);
		}
	}

	TargetMapping = {
			redstone_ore:Block.redstone_ore
	};
	
	BCGlobal = {
			Block:Block,
			Item:Item
			};
	ignoreBlocks = [Block.stone, Block.grass, Block.dirt, Block.coarse_dirt, Block.podzol, Block.sand, Block.red_sand];
}

var BaseDestroyBlockLocation = {x:0, y:0, z:0, side:0};
var DestroyedBlocks={};
var BlockCounter = function(block) {
	this._block=block;
	this._count=0;
}
BlockCounter.prototype.inc = function() {
	this._count++;
}
BlockCounter.prototype.getBlock = function() {
	return this._block;
}
BlockCounter.prototype.getCount = function() {
	return this._count;
}


function destroyBlock(x,y,z,side) {
	if (isBurstMode()) {
		id = Level.getTile(x, y, z);
		data = Level.getData(x, y, z);
		if (!data) {
			data = 0;
		}
		BaseDestroyBlockLocation.x = x;
		BaseDestroyBlockLocation.y = y;
		BaseDestroyBlockLocation.z = z;
		BaseDestroyBlockLocation.side = side;
		processingBlocks = [];
		DestroyedBlocks = {};

		strategy.destroyBlock(x,y,z,side, id, data);
		dropItems(x, y, z);

	}
	
}

function isBurstMode() {
	if (burstMode) {
		slotId = Player.getSelectedSlotId();
		for (var index in targetSlot) {
			if (targetSlot[index] == slotId) {
				return true;
			}
		}
	}
	return false;
	
}

function tempImpl(x,y,z,side, id, data) {
	infoMessage("----");
	infoMessage("x,y,z=" + x + "," + y + "," + z);
	infoMessage("side=" + side);
	infoMessage("id/data=" + id + "/" + data);
	infoMessage("player selected slot id=" + Player.getSelectedSlotId());

}

var destroyBlockImpl = function(x, y, z) {
	debugMessage("destroyBlock("+ x + "," + y + "," + z + ")");
	if (Math.random() * 10 > 1) {
		Level.setTile(x, y, z, Block.air.id, Block.air.data);
	} else {
		Level.destroyBlock(x, y, z, false);
	}
	
}

var dropItems = function(x,y,z) {
	for (var index in DestroyedBlocks) {
		destroyedBlock = DestroyedBlocks[index].getBlock();
		count = DestroyedBlocks[index].getCount();
		for (var dindex in destroyedBlock.drop) {
			blockPath = destroyedBlock.drop[dindex].item.split(".");
			block = BCGlobal;
			for (var findex in blockPath) {
				block = block[blockPath[findex]];
			}
			num = destroyedBlock.drop[dindex].num * count;
			while (num > block.stackSize) {
				Level.dropItem(x, y, z, 0.5, block.id, block.stackSize, block.data);
				num -= block.stackSize;
			}
			Level.dropItem(x, y, z, 0.5, block.id, num, block.data);
		}
	}
}

var validateSafeBlock = function(id, data) {
	if (!safeMode) {
		return true;
	}
	for (var i in ignoreBlocks) {
		if (ignoreBlocks[i].id == id && ignoreBlocks[i].data == data) {
			return false;
		}
	}
	return true;
}

var DestroyGroupBlockStrategy = function(){};
DestroyGroupBlockStrategy.destroyBlock = function(x,y,z,side, id, data) {
	targetBlock = getTargetBlock(id,data);
	if (targetBlock) {
		if (!validateSafeBlock(id, data)) {
			return;
		}
		if ((targetBlock.tool == BCStatics.pickaxe 
				&& isPickaxe(Player.getInventorySlot(Player.getSelectedSlotId()))) 
			||(targetBlock.tool == BCStatics.shovel 
					&& isShovel(Player.getInventorySlot(Player.getSelectedSlotId())))) {
			DestroyGroupBlockStrategy.destroyBlockImpl(x,y,z,side,targetBlock);
		} else {
			// nothing to do
		}
		
	} else {
		// nothing to do.
	}
	
}

DestroyGroupBlockStrategy.destroyBlockImpl = function(x,y,z,side,targetBlock) {
	if (DestroyGroupBlockStrategy.isInternal(x,y,z) 
			&& Level.getTile(x, y, z) == targetBlock.id 
			&& Level.getData(x, y, z) == targetBlock.data) {
		//Level.destroyBlock(x, y, z, false);
		destroyBlockImpl(x,y,z);
		if(!DestroyedBlocks[targetBlock.key]) {
			DestroyedBlocks[targetBlock.key] = new BlockCounter(targetBlock);
		}
		DestroyedBlocks[targetBlock.key].inc();
		
		//Level.setTile(x, y, z, 0, 0);
		// この方法はStackをたくさん積み上げるので他の方法を検討すること。
		DestroyGroupBlockStrategy.destroyBlockImpl(x-1, y, z, side, targetBlock);
		DestroyGroupBlockStrategy.destroyBlockImpl(x+1, y, z, side, targetBlock);
		DestroyGroupBlockStrategy.destroyBlockImpl(x, y, z-1, side, targetBlock);
		DestroyGroupBlockStrategy.destroyBlockImpl(x, y, z+1, side, targetBlock);
		DestroyGroupBlockStrategy.destroyBlockImpl(x, y-1, z, side, targetBlock);
		DestroyGroupBlockStrategy.destroyBlockImpl(x, y+1, z, side, targetBlock);
	}
	
}

DestroyGroupBlockStrategy.isInternal = function(x,y,z) {
	return (BaseDestroyBlockLocation.x + range >= x
			&& BaseDestroyBlockLocation.x - range <= x
			&& BaseDestroyBlockLocation.y + range >= y
			&& BaseDestroyBlockLocation.y - range <= y
			&& BaseDestroyBlockLocation.z + range >= z
			&& BaseDestroyBlockLocation.z - range <= z);
}

var processingBlocks;
var DestroyFlatBlockStrategy = function(){};
DestroyFlatBlockStrategy.destroyBlock = function(x,y,z,side, id, data) {
	targetBlock = getTargetBlock(id,data);
	if (targetBlock) {
		if ((targetBlock.tool == BCStatics.pickaxe 
				&& containPickaxeInTargetSlot()) 
			||(targetBlock.tool == BCStatics.shovel 
					&& containShovelInTargetSlot())) {
//			for (var index in processingBlocks) {
//				if (processingBlocks[index].id == id && processingBlocks[index].data == data) {
//					return;
//				}
//			}
			processingBlocks[processingBlocks.length] = {id:id, data:data};
			DestroyFlatBlockStrategy.destroyBlockImpl(x,y,z,side,targetBlock);
		} else {
			// nothing to do
		}
		
	} else {
		// nothing to do.
	}
}

DestroyFlatBlockStrategy.prevSwitchLocation = {x:NaN,y:NaN,z:NaN};
DestroyFlatBlockStrategy.destroyBlockImpl = function(x,y,z,side,targetBlock) {
	tid = Level.getTile(x, y, z);
	tdata = Level.getData(x, y, z);
	if (DestroyGroupBlockStrategy.isInternal(x,y,z)) {
		if (tid == targetBlock.id && tdata == targetBlock.data) {
			//Level.destroyBlock(x, y, z, false);
			destroyBlockImpl(x,y,z);
			if(!DestroyedBlocks[targetBlock.key]) {
				DestroyedBlocks[targetBlock.key] = new BlockCounter(targetBlock);
			}
			DestroyedBlocks[targetBlock.key].inc();

			
			// この方法はStackをたくさん積み上げるので他の方法を検討すること。
			DestroyFlatBlockStrategy.destroyBlockImpl(x-1, y, z, side, targetBlock);
			DestroyFlatBlockStrategy.destroyBlockImpl(x+1, y, z, side, targetBlock);
			DestroyFlatBlockStrategy.destroyBlockImpl(x, y, z-1, side, targetBlock);
			DestroyFlatBlockStrategy.destroyBlockImpl(x, y, z+1, side, targetBlock);
			//DestroyFlatBlockStrategy.destroyBlockImpl(x, y-1, z, side, targetBlock);
			DestroyFlatBlockStrategy.destroyBlockImpl(x, y+1, z, side, targetBlock);
		} else {
			if (DestroyFlatBlockStrategy.prevSwitchLocation.x != x
					|| DestroyFlatBlockStrategy.prevSwitchLocation.y != y
					|| DestroyFlatBlockStrategy.prevSwitchLocation.z != z) {
				DestroyFlatBlockStrategy.prevSwitchLocation.x = x;
				DestroyFlatBlockStrategy.prevSwitchLocation.y = y;
				DestroyFlatBlockStrategy.prevSwitchLocation.z = z;
				DestroyFlatBlockStrategy.destroyBlock(x,y,z,side,tid,tdata);
			} else {
				DestroyFlatBlockStrategy.prevSwitchLocation.x = NaN;
				DestroyFlatBlockStrategy.prevSwitchLocation.y = NaN;
				DestroyFlatBlockStrategy.prevSwitchLocation.z = NaN;
			} 
		}
	}
	
}

DestroyFlatBlockStrategy.isInternal = function(x,y,z) {
	return (BaseDestroyBlockLocation.x + range >= x
			&& BaseDestroyBlockLocation.x - range <= x
			&& BaseDestroyBlockLocation.y + range >= y
			&& BaseDestroyBlockLocation.y - range <= y
			&& BaseDestroyBlockLocation.z + range >= z
			&& BaseDestroyBlockLocation.z - range <= z);
}


/**
 *  破壊対象Blockを返す
 */
function getTargetBlock(id, data) {
	for ( var name in Block) {
		target = Block[name];
		if (Block[name].id == id && Block[name].data == data) {
			if (TargetMapping[name]) {
				target = TargetMapping[name];
			}
			return target;
		}
	}
	return null;
}

function isPickaxe(id) {
	for (var index in Categories.tools.pickaxe) {
		if (Categories.tools.pickaxe[index].id == id) {
			return true;
		}
	}
	return false;
}

function isShovel(id) {
	for (var index in Categories.tools.shovel) {
		if (Categories.tools.shovel[index].id == id) {
			return true;
		}
	}
	return false;
}

/** 対象Slotにつるはしがあるかを判定 */
function containPickaxeInTargetSlot() {
	for (var index in targetSlot) {
		if (isPickaxe(Player.getInventorySlot(targetSlot[index]))) {
			return true;
		}
	}
	return false;
}

/** 対象Slotにシャベルがあるかを判定 */
function containShovelInTargetSlot() {
	for (var index in targetSlot) {
		if (isShovel(Player.getInventorySlot(targetSlot[index]))) {
			return true;
		}
	}
	return false;
}


function procCmd(cmd) {
	debugMessage("procCmd:" + cmd);
	if(cmd=='mod.dig'){
		burstMode = !burstMode;
		clientMessage("[dig]" + (burstMode ? "enabled." : "disabled."));
	} else if ((result = cmd.match(/^mod.dig\s+(\S+)\s+(.+)/))) {
		if (result[1] == 'mode') {
			updateMode(result[2]);
		} else if (result[1] == 'set') {
			updateProperies(result[2]);
		} else if (result[1] == 'info') {
			errorMessage("" + result[1] + " is not supported.");
		} else if (result[1] == 'help') {
			errorMessage("" + result[1] + " is not supported.");
		} else if (result[1] == 'debug') {
			debugMode = !debugMode;
			infoMessage("debugmode is " + (debugMode ? "enabled." : "disabled."));
		} else {
			errorMessage(result[1] + " is not supported.");
		}
	}
}

function updateProperies(line) {
	debugMessage("updateProperties:" + line);
	if ((result = line.match(/^(\w+) (\d+)/))) {
		if (result[1] == 'range') {
			temp = parseInt(result[2], 10);
			if (temp > MAX_RANGE) {
				errorMessage("range <= 5! value:" + temp);
			} else {
				range = temp;
				infoMessage("range is updated. range=" + range);
			}
		} else if (result[1] == 'safeMode') {
			temp = parseInt(result[2], 10);
			if (temp == 0) {
				safeMode = false;
			} else if (temp == 1) {
				safeMode = true;
			} else {
				errorMessage("safeMode: 0 or 1! value:" + temp);
			}
			infoMessage("safeMode is updated. mode=" + safeMode);
		} 
		else {
			errorMessage("[Update Properites]Illegal Format! args=" + line);
		}
	} else {
		errorMessage("[Update Properties]Illegal Format! args=" + line);
	}
}

function updateMode(mode) {
	debugMessage("updateMode:" + mode);
	//このやり方はダメ。Logicの配列を用意してLogicの追加だけで対応できるように修正するべき。
	if (mode == 'group') {
		// 通常モード。壊したBlockと同じid/dataのBlockのみ破壊。
		infoMessage("mode set group.");
		strategy = DestroyGroupBlockStrategy;
	} else if (mode == 'flat') {
		// 整地モード。壊したBlockよりも上のBlockのみ破壊。
		// 破壊するBlockは手持ちのアイテムによる
		infoMessage("mode set flat.");
		strategy = DestroyFlatBlockStrategy;
	} else if (mode == 'block') {
		// 壊したBlockを中心に指定範囲壊す
		
	} else if (mode == 'face') {
		// 壊した面方向に指定範囲壊す
		
	} else if (mode == 'line') {
		// 壊した面方向?に1ブロックの幅高さで横方向に指定範囲壊す
		infoMessage("mode set line.");
	} else {
		errorMessage("[mode]" + result[mode] + " is not supported.");
	}
}

function updateProperties(props) {
	
}

function errorMessage(message) {
	clientMessage("[dig][err]" + message);
}
function infoMessage(message) {
	clientMessage("[dig][info]" + message);
}
function debugMessage(message) {
	if (debugMode) {
		clientMessage("[dig][debug]" + message);
	}
}



var BCStatics = {
		pickaxe:"pickaxe",
		axe:"axe",
		shovel:"shovel",
};



var Block = {
	//common
	air : {
		key : "air",
		id : 0,
		data : 0,
		label : "Air",
		name : "air",
		tool : "n/a",
		stackSize : 0,
		drop : [],
		experience : [],
		state : {}
	},
	// for pick
	stone : {
		key : "stone",
		id : 1,
		data : 0,
		label : "Stone",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.cobblestone",
			num : 1
		}],
		experience : [],
		state : {
			variant : "stone"
		}
	},
	granite : {
		key : "granite",
		id : 1,
		data : 1,
		label : "Granite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.granite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "granite"
		}
	},
	smooth_granite : {
		key : "smooth_granite",
		id : 1,
		data : 2,
		label : "Polished Granite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.smooth_granite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "smooth_granite"
		}
	},
	diorite : {
		key : "diorite",
		id : 1,
		data : 3,
		label : "Diorite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.diorite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "diorite"
		}
	},
	smooth_diorite : {
		key : "smooth_diorite",
		id : 1,
		data : 4,
		label : "Polished Diorite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.smooth_diorite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "smooth_diorite"
		}
	},
	andesite : {
		key : "andesite",
		id : 1,
		data : 5,
		label : "Andesite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.andesite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "andesite"
		}
	},
	smooth_andesite : {
		key : "smooth_andesite",
		id : 1,
		data : 6,
		label : "Polished Andesite",
		name : "stone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.smooth_andesite",
			num : 1
		}],
		experience : [],
		state : {
			variant : "smooth_andesite"
		}
	},
	cobblestone : {
		key : "cobblestone",
		id : 4,
		data : 0,
		label : "Cobblestone",
		name : "cobblestone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.cobblestone",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.1
		}],
		state : {}
	},

	gold_ore : {
		key : "gold_ore",
		id : 14,
		data : 0,
		label : "Gold Ore",
		name : "gold_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.gold_ore",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 1
		}],
		state : {}
	},
	iron_ore : {
		key : "iron_ore",
		id : 15,
		data : 0,
		label : "Iron Ore",
		name : "iron_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.iron_ore",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.7
		}],
		state : {}
	},
	coal_ore : {
		key : "coal_ore",
		id : 16,
		data : 0,
		label : "Coal Ore",
		name : "coal_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.coal",
			num : 1
		}],
		experience : [{
			means : "Mined",
			exp : 2
		}, {
			means : "Smelted",
			exp : 0.7
		}],
		state : {}
	},
	lapis_ore : {
		key : "lapis_ore",
		id : 21,
		data : 0,
		label : "Lapis Ore",
		name : "lapis_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.lapis_lazuli",
			num : 6
		}],
		experience : [{
			means : "Mined",
			exp : 5
		}, {
			means : "Smelted",
			exp : 0.2
		}],
		state : {}
	},

	sandstone : {
		key : "sandstone",
		id : 24,
		data : 0,
		label : "Sandstone",
		name : "sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "sandstone"
		}
	},
	chiseled_sandstone : {
		key : "chiseled_sandstone",
		id : 24,
		data : 1,
		label : "Chiseled Sandstone",
		name : "sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.chiseled_sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "chiseled_sandstone"
		}
	},
	smooth_sandstone : {
		key : "smooth_sandstone",
		id : 24,
		data : 2,
		label : "Smooth Sandstone",
		name : "sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.smooth_sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "smooth_sandstone"
		}
	},

	red_sandstone : {
		key : "red_sandstone",
		id : 179,
		data : 0,
		label : "Red Sandstone",
		name : "red_sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.red_sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "red_sandstone"
		}
	},
	chiseled_red_sandstone : {
		key : "chiseled_red_sandstone",
		id : 179,
		data : 1,
		label : "Chiseled Red Sandstone",
		name : "chiseled_red_sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.chiseled_red_sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "chiseled_red_sandstone"
		}
	},
	smooth_red_sandstone : {
		key : "smooth_red_sandstone",
		id : 179,
		data : 2,
		label : "Smooth Red Sandstone",
		name : "red_sandstone",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.smooth_red_sandstone",
			num : 1
		}],
		experience : [],
		state : {
			type : "smooth_red_sandstone"
		}
	},
	diamond_ore : {
		key : "diamond_ore",
		id : 56,
		data : 0,
		label : "Diamond Ore",
		name : "diamond_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.diamond",
			num : 1
		}],
		experience : [{
			means : "Mined",
			exp : 7
		}, {
			means : "Smelted",
			exp : 1
		}],
		state : {}
	},
	redstone_ore : {
		key : "redstone_ore",
		id : 73,
		data : 0,
		label : "Redstone Ore",
		name : "redstone_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.redstone",
			num : 5
		}],
		experience : [{
			means : "Mined",
			exp : 5
		}, {
			means : "Smelted",
			exp : 0.7
		}],
		state : {}
	},
	lit_redstone_ore : {
		key : "lit_redstone_ore",
		id : 74,
		data : 0,
		label : "Glowing Redstone Ore",
		name : "lit_redstone_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.redstone",
			num : 5
		}],
		experience : [{
			means : "Mined",
			exp : 5
		}, {
			means : "Smelted",
			exp : 0.7
		}],
		state : {}
	},
	netherrack : {
		key : "netherrack",
		id : 87,
		data : 0,
		label : "Netherrack",
		name : "netherrack",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.netherrack",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.1
		}],
		state : {}
	},
	emerald_ore : {
		key : "emerald_ore",
		id : 129,
		data : 0,
		label : "Emerald Ore",
		name : "emerald_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.emerald",
			num : 1
		}],
		experience : [{
			means : "Mined",
			exp : 7
		}, {
			means : "Smelted",
			exp : 1
		}],
		state : {}
	},
	quartz_ore : {
		key : "quartz_ore",
		id : 153,
		data : 0,
		label : "Nether Quartz Ore",
		name : "quartz_ore",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Item.quartz",
			num : 1
		}],
		experience : [{
			means : "Mined",
			exp : 5
		}, {
			means : "Smelted",
			exp : 0.2
		}],
		state : {}
	},
	hardened_clay_white : {
		key : "hardened_clay_white",
		id : 172,
		data : 1,
		label : "White hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_white",
			num : 1
		}],
		experience : [],
		state : {
			color : "white"
		}
	},
	hardened_clay_orange : {
		key : "hardened_clay_orange",
		id : 172,
		data : 2,
		label : "orange hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_orange",
			num : 1
		}],
		experience : [],
		state : {
			color : "orange"
		}
	},
	hardened_clay_magenta : {
		key : "hardened_clay_magenta",
		id : 172,
		data : 3,
		label : "magenta hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_magenta",
			num : 1
		}],
		experience : [],
		state : {
			color : "magenta"
		}
	},
	hardened_clay_light_blue : {
		key : "hardened_clay_light_blue",
		id : 172,
		data : 4,
		label : "light blue hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_light_blue",
			num : 1
		}],
		experience : [],
		state : {
			color : "light_blue"
		}
	},
	hardened_clay_yellow : {
		key : "hardened_clay_yellow",
		id : 172,
		data : 5,
		label : "yellow hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_yellow",
			num : 1
		}],
		experience : [],
		state : {
			color : "yellow"
		}
	},
	hardened_clay_lime : {
		key : "hardened_clay_lime",
		id : 172,
		data : 6,
		label : "lime hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_lime",
			num : 1
		}],
		experience : [],
		state : {
			color : "lime"
		}
	},
	hardened_clay_pink : {
		key : "hardened_clay_pink",
		id : 172,
		data : 8,
		label : "pink hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_pink",
			num : 1
		}],
		experience : [],
		state : {
			color : "pink"
		}
	},
	hardened_clay_gray : {
		key : "hardened_clay_gray",
		id : 172,
		data : 9,
		label : "gray hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_gray",
			num : 1
		}],
		experience : [],
		state : {
			color : "gray"
		}
	},
	hardened_clay_silver : {
		key : "hardened_clay_silver",
		id : 172,
		data : 10,
		label : "Light gray hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_silver",
			num : 1
		}],
		experience : [],
		state : {
			color : "silver"
		}
	},
	hardened_clay_cyan : {
		key : "hardened_clay_cyan",
		id : 172,
		data : 9,
		label : "cyan hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_cyan",
			num : 1
		}],
		experience : [],
		state : {
			color : "cyan"
		}
	},
	hardened_clay_purple : {
		key : "hardened_clay_purple",
		id : 172,
		data : 10,
		label : "purple hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_purple",
			num : 1
		}],
		experience : [],
		state : {
			color : "purple"
		}
	},
	hardened_clay_blue : {
		key : "hardened_clay_blue",
		id : 172,
		data : 11,
		label : "blue hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_blue",
			num : 1
		}],
		experience : [],
		state : {
			color : "blue"
		}
	},
	hardened_clay_brown : {
		key : "hardened_clay_brown",
		id : 172,
		data : 12,
		label : "brown hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_brown",
			num : 1
		}],
		experience : [],
		state : {
			color : "brown"
		}
	},
	hardened_clay_green : {
		key : "hardened_clay_green",
		id : 172,
		data : 13,
		label : "green hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_green",
			num : 1
		}],
		experience : [],
		state : {
			color : "green"
		}
	},
	hardened_clay_red : {
		key : "hardened_clay_red",
		id : 172,
		data : 14,
		label : "red hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_red",
			num : 1
		}],
		experience : [],
		state : {
			color : "red"
		}
	},
	hardened_clay_black : {
		key : "hardened_clay_black",
		id : 172,
		data : 15,
		label : "black hardened clay",
		name : "hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.hardened_clay_black",
			num : 1
		}],
		experience : [],
		state : {
			color : "black"
		}
	},
	stained_hardened_clay_white : {
		key : "stained_hardened_clay_white",
		id : 152,
		data : 1,
		label : "Whitestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_white",
			num : 1
		}],
		experience : [],
		state : {
			color : "white"
		}
	},
	stained_hardened_clay_orange : {
		key : "stained_hardened_clay_orange",
		id : 152,
		data : 2,
		label : "orangestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_orange",
			num : 1
		}],
		experience : [],
		state : {
			color : "orange"
		}
	},
	stained_hardened_clay_magenta : {
		key : "stained_hardened_clay_magenta",
		id : 152,
		data : 3,
		label : "magentastained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_magenta",
			num : 1
		}],
		experience : [],
		state : {
			color : "magenta"
		}
	},
	stained_hardened_clay_light_blue : {
		key : "stained_hardened_clay_light_blue",
		id : 152,
		data : 4,
		label : "light bluestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_light_blue",
			num : 1
		}],
		experience : [],
		state : {
			color : "light_blue"
		}
	},
	stained_hardened_clay_yellow : {
		key : "stained_hardened_clay_yellow",
		id : 152,
		data : 5,
		label : "yellowstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_yellow",
			num : 1
		}],
		experience : [],
		state : {
			color : "yellow"
		}
	},
	stained_hardened_clay_lime : {
		key : "stained_hardened_clay_lime",
		id : 152,
		data : 6,
		label : "limestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_lime",
			num : 1
		}],
		experience : [],
		state : {
			color : "lime"
		}
	},
	stained_hardened_clay_pink : {
		key : "stained_hardened_clay_pink",
		id : 152,
		data : 8,
		label : "pinkstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_pink",
			num : 1
		}],
		experience : [],
		state : {
			color : "pink"
		}
	},
	stained_hardened_clay_gray : {
		key : "stained_hardened_clay_gray",
		id : 152,
		data : 9,
		label : "graystained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_gray",
			num : 1
		}],
		experience : [],
		state : {
			color : "gray"
		}
	},
	stained_hardened_clay_silver : {
		key : "stained_hardened_clay_silver",
		id : 152,
		data : 10,
		label : "Light graystained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_silver",
			num : 1
		}],
		experience : [],
		state : {
			color : "silver"
		}
	},
	stained_hardened_clay_cyan : {
		key : "stained_hardened_clay_cyan",
		id : 152,
		data : 9,
		label : "cyanstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_cyan",
			num : 1
		}],
		experience : [],
		state : {
			color : "cyan"
		}
	},
	stained_hardened_clay_purple : {
		key : "stained_hardened_clay_purple",
		id : 152,
		data : 10,
		label : "purplestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_purple",
			num : 1
		}],
		experience : [],
		state : {
			color : "purple"
		}
	},
	stained_hardened_clay_blue : {
		key : "stained_hardened_clay_blue",
		id : 152,
		data : 11,
		label : "bluestained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_blue",
			num : 1
		}],
		experience : [],
		state : {
			color : "blue"
		}
	},
	stained_hardened_clay_brown : {
		key : "stained_hardened_clay_brown",
		id : 152,
		data : 12,
		label : "brownstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_brown",
			num : 1
		}],
		experience : [],
		state : {
			color : "brown"
		}
	},
	stained_hardened_clay_green : {
		key : "stained_hardened_clay_green",
		id : 152,
		data : 13,
		label : "greenstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_green",
			num : 1
		}],
		experience : [],
		state : {
			color : "green"
		}
	},
	stained_hardened_clay_red : {
		key : "stained_hardened_clay_red",
		id : 152,
		data : 14,
		label : "redstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_red",
			num : 1
		}],
		experience : [],
		state : {
			color : "red"
		}
	},
	stained_hardened_clay_black : {
		key : "stained_hardened_clay_black",
		id : 152,
		data : 15,
		label : "blackstained hardened clay",
		name : "stained_hardened_clay",
		tool : BCStatics.pickaxe,
		stackSize : 64,
		drop : [{
			item : "Block.stained_hardened_clay_black",
			num : 1
		}],
		experience : [],
		state : {
			color : "black"
		}
	},

	//
	//for Shovel
	//
	grass : {
		key : "grass",
		id : 2,
		data : 0,
		label : "Grass",
		name : "grass",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.dirt",
			num : 1
		}],
		experience : [],
		state : {
			snowy : false
		}
	},
	dirt : {
		key : "dirt",
		id : 3,
		data : 0,
		label : "Dirt",
		name : "dirt",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.dirt",
			num : 1
		}],
		experience : [],
		state : {
			variant : "dirt",
			snowy : false
		}
	},
	coarse_dirt : {
		key : "coarse_dirt",
		id : 3,
		data : 1,
		label : "Coarse Dirt",
		name : "dirt",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.coarse_dirt",
			num : 1
		}],
		experience : [],
		state : {
			variant : "coarse_dirt",
			snowy : false
		}
	},
	podzol : {
		key : "podzol",
		id : 3,
		data : 2,
		label : "Podzol",
		name : "dirt",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.podzol",
			num : 1
		}],
		experience : [],
		state : {
			variant : "podzol",
			snowy : false
		}
	},
	sand : {
		key : "sand",
		id : 12,
		data : 0,
		label : "Sand",
		name : "sand",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.sand",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.1
		}],
		state : {
			variant : "sand"
		}
	},
	red_sand : {
		key : "red_sand",
		id : 12,
		data : 1,
		label : "Red Sand",
		name : "sand",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.red_sand",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.1
		}],
		state : {
			variant : "red_sand"
		}
	},
	gravel : {
		key : "gravel",
		id : 13,
		data : 0,
		label : "Gravel",
		name : "gravel",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.gravel",
			num : 0.9
		}, {
			item : "Item.flint",
			num : 0.1
		}],
		experience : [],
		state : {}
	},
	clay : {
		key : "clay",
		id : 82,
		data : 0,
		label : "Clay",
		name : "clay",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.clay",
			num : 1
		}],
		experience : [{
			means : "Smelted",
			exp : 0.35
		}],
		state : {}
	},
	soul_sand : {
		key : "soul_sand",
		id : 88,
		data : 0,
		label : "Soul Sand",
		name : "soul_sand",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.soul_sand",
			num : 1
		}],
		experience : [],
		state : {}
	},
	mycelium : {
		key : "mycelium",
		id : 110,
		data : 0,
		label : "Mycelium",
		name : "mycelium",
		tool : BCStatics.shovel,
		stackSize : 64,
		drop : [{
			item : "Block.dirt",
			num : 1
		}],
		experience : [],
		state : {
			snowy : false
		}
	},

	//
	// grass and flowers
	//
	dead_bush : {
		key : "dead_bush",
		id : 31,
		data : 0,
		label : "Shrub",
		name : "tallgrass",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Item.sheeds",
			num : 0.2
		}],
		experience : [],
		state : {
			type : "dead_bush"
		}
	},
	tall_grass : {
		key : "tall_grass",
		id : 31,
		data : 1,
		label : "Tall Grass",
		name : "tallgrass",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Item.sheeds",
			num : 0.2
		}],
		experience : [],
		state : {
			type : "tall_grass"
		}
	},
	fern : {
		key : "fern",
		id : 31,
		data : 2,
		label : "Fern",
		name : "tallgrass",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Item.sheeds",
			num : 0.2
		}],
		experience : [],
		state : {
			type : "fern"
		}
	},
	dandelion : {
		key : "dandelion",
		id : 37,
		data : 0,
		label : "Dandelion",
		name : "yellow_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.dandelion",
			num : 1
		}],
		experience : [],
		state : {
			type : "dandelion"
		}
	},
	poppy : {
		key : "poppy",
		id : 38,
		data : 0,
		label : "Poppy",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.poppy",
			num : 1
		}],
		experience : [],
		state : {
			type : "poppy"
		}
	},
	blue_orchid : {
		key : "blue_orchid",
		id : 38,
		data : 1,
		label : "Blue Orchid",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.blue_orchid",
			num : 1
		}],
		experience : [],
		state : {
			type : "blue_orchid"
		}
	},
	allium : {
		key : "allium",
		id : 38,
		data : 2,
		label : "Allium",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.allium",
			num : 1
		}],
		experience : [],
		state : {
			type : "allium"
		}
	},
	houstonia : {
		key : "houstonia",
		id : 38,
		data : 3,
		label : "Azure Bluet",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.houstonia",
			num : 1
		}],
		experience : [],
		state : {
			type : "houstonia"
		}
	},
	red_tulip : {
		key : "red_tulip",
		id : 38,
		data : 4,
		label : "Red Tulip",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.red_tulip",
			num : 1
		}],
		experience : [],
		state : {
			type : "red_tulip"
		}
	},
	orange_tulip : {
		key : "orange_tulip",
		id : 38,
		data : 5,
		label : "Orange Tulip",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.orange_tulip",
			num : 1
		}],
		experience : [],
		state : {
			type : "orange_tulip"
		}
	},
	white_tulip : {
		key : "white_tulip",
		id : 38,
		data : 6,
		label : "White Tulip",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.white_tulip",
			num : 1
		}],
		experience : [],
		state : {
			type : "white_tulip"
		}
	},
	pink_tulip : {
		key : "pink_tulip",
		id : 38,
		data : 7,
		label : "Pink Tulip",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.pink_tulip",
			num : 1
		}],
		experience : [],
		state : {
			type : "pink_tulip"
		}
	},
	oxeye_daisy : {
		key : "oxeye_daisy",
		id : 38,
		data : 8,
		label : "Oxeye Daisy",
		name : "red_flower",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.oxeye_daisy",
			num : 1
		}],
		experience : [],
		state : {
			type : "oxeye_daisy"
		}
	},

	sunflower : {
		key : "sunflower",
		id : 175,
		data : 0,
		label : "Sunflower",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.sunflower",
			num : 1
		}],
		experience : [],
		state : {
			variant : "sunflower",
			half : "lower",
			facing : "south"
		}
	},
	syringa : {
		key : "syringa",
		id : 175,
		data : 1,
		label : "Lilac",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.syringa",
			num : 1
		}],
		experience : [],
		state : {
			variant : "syringa",
			half : "lower",
			facing : "south"
		}
	},
	double_grass : {
		key : "double_grass",
		id : 175,
		data : 2,
		label : "Double Tallgrass",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Item.sheeds",
			num : 0.2
		}],
		experience : [],
		state : {
			variant : "double_grass",
			half : "lower",
			facing : "south"
		}
	},
	double_fern : {
		key : "double_fern",
		id : 175,
		data : 3,
		label : "Large Fern",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Item.sheeds",
			num : 0.2
		}],
		experience : [],
		state : {
			variant : "double_fern",
			half : "lower",
			facing : "south"
		}
	},
	double_rose : {
		key : "double_rose",
		id : 175,
		data : 4,
		label : "Rose Bush",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.double_rose",
			num : 1
		}],
		experience : [],
		state : {
			variant : "double_rose",
			half : "lower",
			facing : "south"
		}
	},
	paeonia : {
		key : "paeonia",
		id : 175,
		data : 5,
		label : "Peony",
		name : "double_plant",
		tool : "any",
		stackSize : 64,
		drop : [{
			item : "Block.paeonia",
			num : 1
		}],
		experience : [],
		state : {
			variant : "paeonia",
			half : "lower",
			facing : "south"
		}
	}

};

var Item = {
	coal : {
		key : "coal",
		type : "Raw materials",
		id : 263,
		data : 0,
		label : "Coal",
		name : "coal",
		Durability : -1,
		renewable : true,
		stackSize : 64,
	},
	lapis_lazuli : {
		key : "lapis_lazuli",
		type : "Wool dyes",
		id : 351,
		data : 4,
		label : "Lapis Lazuli",
		name : "dye 4",
		Durability : 4,
		renewable : true,
		stackSize : 64,
	},
	diamond : {
		key : "diamond",
		type : "Raw materials",
		id : 264,
		data : 0,
		label : "Diamond",
		name : "diamond",
		Durability : -1,
		renewable : false,
		stackSize : 64,
	},
	redstone : {
		key : "redstone",
		type : "Raw materials",
		id : 331,
		data : 0,
		label : "Redstone",
		name : "redstone",
		Durability : -1,
		renewable : true,
		stackSize : 64,
	},
	emerald : {
		key : "emerald",
		type : "Raw materials",
		id : 388,
		data : 0,
		label : "Emerald",
		name : "emerald",
		Durability : -1,
		renewable : true,
		stackSize : 64,
	},
	quartz : {
		key : "quartz",
		type : "Raw materials",
		id : 406,
		data : 0,
		label : "Nether Quartz",
		name : "quartz",
		Durability : -1,
		renewable : false,
		stackSize : 64,
	},
	flint : {
		key : "flint",
		type : "Raw materials",
		id : 318,
		data : 0,
		label : "Flint",
		name : "flint",
		Durability : -1,
		renewable : false,
		stackSize : 64,
	},

	//
	// pickaxe
	wooden_pickaxe : {
		key : "wooden_pickaxe",
		type : "Tools",
		id : 270,
		data : 0,
		label : "Wooden Pickaxe",
		name : "wooden_pickaxe",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	stone_pickaxe : {
		key : "stone_pickaxe",
		type : "Tools",
		id : 274,
		data : 0,
		label : "Stone Pickaxe",
		name : "stone_pickaxe",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	iron_pickaxe : {
		key : "iron_pickaxe",
		type : "Tools",
		id : 257,
		data : 0,
		label : "Iron Pickaxe",
		name : "iron_pickaxe",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	golden_pickaxe : {
		key : "golden_pickaxe",
		type : "Tools",
		id : 285,
		data : 0,
		label : "Golden Pickaxe",
		name : "golden_pickaxe",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	diamond_pickaxe : {
		key : "diamond_pickaxe",
		type : "Tools",
		id : 278,
		data : 0,
		label : "Diamond Pickaxe",
		name : "diamond_pickaxe",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	//
	// shovel
	//
	wooden_shovel : {
		key : "wooden_shovel",
		type : "Tools",
		id : 269,
		data : 0,
		label : "Wooden Shovel",
		name : "wooden_shovel",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	stone_shovel : {
		key : "stone_shovel",
		type : "Tools",
		id : 273,
		data : 0,
		label : "Stone Shovel",
		name : "stone_shovel",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	iron_shovel : {
		key : "iron_shovel",
		type : "Tools",
		id : 256,
		data : 0,
		label : "Iron Shovel",
		name : "iron_shovel",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	golden_shovel : {
		key : "golden_shovel",
		type : "Tools",
		id : 284,
		data : 0,
		label : "Golden Shovel",
		name : "golden_shovel",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	},
	diamond_shovel : {
		key : "diamond_shovel",
		type : "Tools",
		id : 277,
		data : 0,
		label : "Diamond Shovel",
		name : "diamond_shovel",
		Durability : -1,
		renewable : true,
		stackSize : 1,
	}

};

init();
