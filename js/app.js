$(document).foundation()
var statHistory = new Array();
var races = new Object();
var blockScroll = false;

LoadRaces();

$(document).ready(function(){
    $(window).on('touchmove', function(e)
	{
		if (blockScroll)
		{
			e.preventDefault();
		}
	});
		
	jQuery.fn.swap = function(b){ 
		// method from: http://blog.pengoworks.com/index.cfm/2008/9/24/A-quick-and-dirty-swap-method-for-jQuery
		b = jQuery(b)[0]; 
		var a = this[0]; 
		var t = a.parentNode.insertBefore(document.createTextNode(''), a); 
		b.parentNode.insertBefore(a, b); 
		t.parentNode.insertBefore(b, t); 
		t.parentNode.removeChild(t); 
		return this; 
	};

	$( ".stat-base" ).mousedown(function(){
		$(this).attr("data-width", $(this).outerWidth());
		$(this).attr("data-height", $(this).outerHeight());
	}).draggable({ helper: "clone",start: function( event, ui ) {
		$(ui.helper).css("display","block");
		$(ui.helper).css("width", $(this).attr("data-width") + "px");
		$(ui.helper).css("height", $(this).attr("data-height")  + "px");
		blockScroll = true;
	} });
	
	$( ".stat-base" ).droppable({
		accept: ".stat-base",
		activeClass: "ui-state-hover",
		hoverClass: "ui-state-active",
		drop: function( event, ui ) {
			var draggable = ui.draggable;
			var droppable = $(this);
			
			var dragVal = $(draggable).html();
			var dropVal = $(droppable).html();
			
			$(draggable).html(dropVal);
			$(droppable).html(dragVal);
			
			UpdateTotals();
			blockScroll = false;
		}
	});

	$("#rollAction").click(function(){
		RollStats($(this).attr("data-type"));
		
	});
	
	$(".roll-stats").click(function(){
		$("#rollAction").html($(this).html()).attr("data-type", $(this).attr("data-type"));
		RollStats($(this).attr("data-type"));
		
		$("#rollOptions").foundation('close');
	});
	
	$(".stat-type").change(function(){
		if($(this).val() != $(this).attr("data-curr")){
			
			var source = $(this).closest("div").find(".stat-base");
			var target = $("#box_" + $(this).val().toLowerCase()).find(".stat-base");
			
			var targetVal = $(target).html();
			var sourceVal = $(source).html();
			
			$(target).html(sourceVal);
			$(source).html(targetVal);
			
			$(this).val($(this).attr("data-curr"));	

			UpdateTotals();					
		}
	});
	$(".mod").blur(function(){
		if(!$.isNumeric($(this).val())){
			$(this).val("0");
		}
		
		UpdateTotals();
	}).click(function(){
		$(this).select();
	});
	
	$("#undo").click(function(){
		statHistory.pop();
		stats = statHistory[statHistory.length - 1];
		
		for(i = 0; i < stats.length; i++){
			$("#stat_" + (i+1)).html(stats[i]);
		}
		
		UpdateTotals();
		
		if(statHistory.length == 1){
			$(this).prop("disabled",true);
		}
	});
	
	$("#raceList").change(function(){
		var html = "<option value='-1'>No Sub Races</option>";
		
		if($(this).val() == -1){
			LoadStats([0,0,0,0,0,0]);
		}else
		{
			var race = races[$(this).val()];
			var stats = race.mods.split(",");
			LoadStats(stats);
			
			if(race.subRaces.length > 0){
				var html = "<option value='-1'>Sub Race...</option>";
				for(i  = 0; i < race.subRaces.length; i++){
					html += "<option value='" + i + "'>" + race.subRaces[i].name + "</option>";
				}
			}	
			
			$("#raceNotes").html(race.notes);
		}
		
		$("#subRaceList").html(html);
	});
	
	$("#subRaceList").change(function(){
		if($(this).val() == -1){
			LoadStats([0,0,0,0,0,0]);
		}else
		{
			var race = races[$("#raceList").val()].subRaces[$(this).val()];
			var stats = race.mods.split(",");
			LoadStats(stats);
		}
	});
});

function LoadStats(stats){
	var mods = $(".mod");
		
	var i = 0;
	$(mods).each(function(){
		$(this).val(stats[i]);
		i+= 1;
	});
	
	UpdateTotals();
}

function LoadRaces() {
	$.ajax({
	  url: "./assets/races.json",
	  success: function(data){
		 var html = "<option value='-1'>Custom</option>";
		 
		races = JSON.parse(data);
		races = races.races;
		for(i = 0; i < races.length; i++)
		{
			html += "<option value='" + i + "'>" + races[i].name + "</option>";
		}
		
		$("#raceList").html(html);
	  }
	});
}

function RollStats(type){
	if(statHistory.length > 0){
		$("#undo").prop("disabled", false);
	}
		
	var total = 0;
	var stats = new Array();
	
	for(stat = 1; stat <= 6; stat++){
		var statTotal = 0;
		var rolls = new Array();
		
		switch(type){
			case "1":
				//4D6 - Drop Lowest
				
		
				for(i = 0; i < 4; i++){
					rolls.push(RollDi(6));
				}
			
				statTotal = rolls.reduce(add, 0);
				statTotal -= Math.min.apply(null,rolls);
				break;
			case "2":
				//3D6 - Fixed
				for(i = 0; i < 3; i++){
					rolls.push(RollDi(6));
				}
			
				statTotal = rolls.reduce(add, 0);
				break;
			case "3":
				//3D6 - Best of 3
				var bestOf = new Array();
				for(i = 0;  i < 3; i++){
					rolls = new Array();
				
					for(i = 0; i < 3; i++){
						rolls.push(RollDi(6));
					}
				
					bestOf.push(rolls.reduce(add, 0));
				}
				
				statTotal = Math.max.apply(null,bestOf);
				break;
			case "4":
				//d20 straight up
								
				statTotal = RollDi(20);
				break;
			case "C":
				var custom = $("#customRoll").val();
				var di = 20;
				var count = 1;
				var rerollLimit = 0;
				var dropLowest = 0;
				var addVal = 0;
				var parts = custom.replace(" ","").split(",");
				
				if(parts.length > 0){
					
					if(parts[0].indexOf("+") > 0){
						addVal = parseInt(parts[0].split("+")[1]);
						parts[0] = parts[0].split("+")[0];
					}
					var roll = parts[0].split("d");
					if(roll.length == 1){
						di = parseInt(roll[0]);
					}else if (roll.length == 2){
						count = parseInt(roll[0]);
						di = parseInt(roll[1]);
					}
				}
				
				for(i = 1; i  < parts.length; i++){
					switch(parts[i].substring(0,1)){
						case "r":
							rerollLimit = parts[i].replace("r","");
							break;
						case "l":
							dropLowest = parts[i].replace("l","");
							break;
					}
				}
				
				for(i = 0; i < count; i++){
					var roll = RollDi(di);
					if(rerollLimit > 0){
						while(roll <= rerollLimit){
							roll = RollDi(di);
						}
					}
					
					rolls.push(roll);
				}
				
				
				
				if(dropLowest > 0){
					rolls.sort(function(a, b){return a - b});
					for(i = 0; i < dropLowest; i++){
						rolls.shift();
					}
				}
				
				statTotal = rolls.reduce(add, 0) + addVal;
				
				break;
		}
		
		total += statTotal;
		stats.push(statTotal);
		$("#stat_" + stat).html(statTotal + '<i class="drag-icon fas fa-ellipsis-v"></i>');
	}
	
	statHistory.push(stats);
	
	if(statHistory.length > 10){
		statHistory.shift();
	}
	
	UpdateTotals();
}

function RollDi(type){
	return parseInt(Math.floor((Math.random() * type) + 1));
}
	
function add(a, b) {return parseInt(a) + parseInt(b);}

function UpdateTotals(){
	var total = 0;
	
	for(stat = 1; stat <= 6; stat++){
		//var type = $("#type_" + stat).val();
		var base = parseInt($("#stat_" + stat).html());
		total += base;
		
		if(!$.isNumeric(base)){break;}
		
		var mod = parseInt($("#mod_" + stat).val());
		var score = base + mod;
		
		$("#total_" + stat).attr("class", "callout stat-total small " + GetClass(score)).html(base + mod);
		$("#bonus_" + stat).html(GetBonus(score));
	}
	
	$("#stat_total").html(total);
}

function GetClass(score){
 if(score < 10){
	return "alert";
 }else if(score > 11){
	return "success";
 }else{
	return "primary";
 }
}

function GetBonus(score){
	switch(score){
		case 1:
		case 2:
		case 3:
			return "-4";
		case 4:
		case 5:
			return "-3";
		case 6:
		case 7:
			return "-2";
		case 8:
		case 9:
			return "-1";
		case 10:
		case 11:
			return "0";
		case 12:
		case 13:
			return "+1";
		case 14:
		case 15:
			return "+2";
		case 16:
		case 17:
			return "+3";
		case 18:
		case 19:
			return "+4";
		case 20:
		case 21:
			return "+5";
		case 22:
			return "+6";
		default:
			return "0";
	}
}

(function() {
  function touchHandler(e) {
    var touches = e.changedTouches;
    var first = touches[0];
    var type = "";

    switch(e.type) {
      case "touchstart":
        type = "mousedown";
        break;
      case "touchmove":
        type="mousemove";
        break;        
      case "touchend":
        type="mouseup";
        break;
      default:
        return;
    }
      
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0, null);

    first.target.dispatchEvent(simulatedEvent);
    //e.preventDefault();
  }

  function init() {
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, true);
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);    
  }

  init();
})();