$('.btnUserLogin').click(function () {
    var name = $("#loginName").val();
    setPlayer(name);
});

$('.btnUseWord').click(function() {
	var word = $("#inputWord").val();	
	checkWord(word);
});

$('.btnSkipWord').click(function() {
	checkWord("",true);
});

$('.btnPlayAgain').click(function() {
	restartGame();
});
$('.btnNewGame').click(function() {
	newGame();
});
$('.btnNewPlayer').click(function() {
	resetApp();
});
$('.btnCorrectionContinue').click(function() {
	clearCorrectionFlag();
});

function postScore(gameData) {
	$.ajax({
	  type: "POST",
	  url: "https://requestb.in/1au79rm1",
	  data: gameData
	});
}

function setPlayer(name) {
	if (name.length > 0) {
    	gameData.playerName = name;
    	drawViews();
    }
}

function restartGame() {
	gameData.gameStep = 0;
	gameData.tryCount = 0;
	startGame(gameData.gameNo);
}

function newGame() {
	gameData.gameNo = undefined;
	gameData.gameStep = 0;
	gameData.tryCount = 0;
	drawViews();
}

function clearCorrectionFlag() {
	gameData.correctionFlag = false;
	drawViews();
}

function checkWord(word, skip) {
	if (skip == undefined) {
		skip = false;
	} else {
		word = "Word Skipped";
	}
	if (word.length < 1 && !skip) {
		alertify.error("Please enter the answer first");
		return;
	}
	gameData.tryCount++;

	var isCorrect = false;
	var rslt = null;
	if (!skip) {
		var answers = gameData.source.words[gameData.gameStep].answers;
		$.each(answers, function(index, value) { 
			if (rslt == null && value.toLowerCase() === word.toLowerCase()) {
				rslt = index;
				isCorrect = true;
			}
		});
	}
	
	gameData.source.words[gameData.gameStep].tries = gameData.tryCount;
	if (isCorrect) {
		var msg = "<img src='https://media.giphy.com/media/3oz8xPjPPvOwrGjip2/giphy.gif' width='200px'><h3>Correct</h3><p>Well done !</p>";
		alertify.delay(5000).success(msg);
		gameData.source.words[gameData.gameStep].score = 1;
		gameData.source.words[gameData.gameStep].given = word;
		gameData.gameStep++;
		gameData.tryCount = 0;
	} else { 							//not correct 
		if (gameData.source.words[gameData.gameStep].wrongGiven == undefined)
			gameData.source.words[gameData.gameStep].wrongGiven = [];
		gameData.source.words[gameData.gameStep].wrongGiven.push(word);
		gameData.source.words[gameData.gameStep].score = 0;
		if (gameData.tryCount >= 3 || skip){
			var msg = "<img src='https://media.giphy.com/media/l3vQYxsyauUub9oJi/giphy.gif' width='200px'><h3>Out of Luck</h3><p>Review the correct answer</p>";
			alertify.delay(8000).error(msg);
			gameData.gameStep++;
			gameData.tryCount = 0;
			gameData.correctionFlag = true;
		} else {
			var msg = "<img src='https://media.giphy.com/media/l0HlIkUigWdQLaWju/giphy.gif' width='200px'><h3>Wrong</h3><p>" + word + " is wrong, try again</p>";
			alertify.delay(5000).error(msg);
		}
	}

	drawViews();
}




/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function enrichWordListWithHints(words) {
	var hintDifficulty = 3; //1 = minimum/no hints. Higher numbers = more difficult
	var newWords = [];

	$.each(words, function(index, value) { 
		var answer = "";
		if (value.answers != undefined && value.answers.length > 0) {
			answer = value.answers[0];
		}

		var hint = "No hint";
		if (answer.length > 2) {
			hint = "";
			var letterCount = answer.length;
			var first = 0;
			var last = letterCount - 1;
			//hint = answer[first] + " " + Array(letterCount - 1).join("_ ") + answer[last];
			var lastReveal = 1000;
			for (var i = 0; i < letterCount; i++) {
				// if (i == 0 || i >= (letterCount - 1)) {
				// 	hint += answer[i];
				// } else {
					var min = 1, max = 1;
					if (lastReveal == 0) {
						min = 0;
						max = 0;
					} else {
						if (lastReveal < hintDifficulty) {
							max = hintDifficulty - lastReveal;
						}
					}
					if (max == 1 || getRandomInt(min, max) == 1) {
						hint += answer[i];
						lastReveal = 0;
					} else {
						hint += "_";
						lastReveal++;
					}
				//}
			}
		}
		value.hint = hint;
		newWords.push(value);
	});
	return newWords;
}

function randomizeAndReduceGameWordsList(words, wordCount) {
	if (wordCount == undefined || wordCount < 0)
		wordCount = 10;

	var newWords = [];
	$.each(words, function(index, value) { 
		value.randomId = Math.random();;
		newWords.push(value);
	});
	
	newWords.sort(function(a,b) {
		return ((a.randomId > b.randomId) ? 1 : -1);
	});

	wordCount = ((newWords.length < wordCount) ? newWords.length : wordCount);
	return newWords.slice(0, wordCount);
}


function getGameData(gameNo, setGameSourceCallback, failReason) {
	var url = "";
	var result = "";

	url = gAppConfig.games[gameNo - 1].data;
	
	if (url.length > 0) {
		alertify.success("Pulling game from internet...please wait...");
		$.ajax({
			type: 'GET',
		    url: url,
		    timeout: 10000,
		    success: function( response ) {
		    	setGameSourceCallback(true, response);
		        //result = response; //jQuery.parseJSON( response );;
		    },
		    error: function(xhr, textStatus, errorThrown){
		       setGameSourceCallback(false, undefined, textStatus + " - " + errorThrown);
		    }
		});
	} else {
		setGameSourceCallback(false, undefined, "Invalid game option selected");
	}
}

function startGame(gameNo) {
	//load a game

	getGameData(gameNo, function(success, source, reason) {
		if (success) {
			newGameSource = source;
			newGameSource.words = randomizeAndReduceGameWordsList(newGameSource.words, source.wordCount);
			newGameSource.words = enrichWordListWithHints(newGameSource.words);
			gameData.source = newGameSource;
			gameData.gameNo = gameNo;
			drawViews();
		} else {
			alertify.error("Could not get game - " + reason);
		}
	});
	
}

function drawViews(){
	$(".loadingView").hide();
	$(".navbar").hide();
	$(".loginView").hide();
	$(".menuView").hide();
	$(".playView").hide();
	$(".resultView").hide();
	$(".correctWordView").hide();

	if (gameData == undefined || gameData.playerName == "")
	{
		$('#loginName').val("");
		$("#lblWelcomeTitle").text(gAppConfig.welcomeTitle);
		$("#navbarTitle").text(gAppConfig.title);
		$("#imgWelcomeImage").attr("src",gAppConfig.welcomeImage);
		$(".loginView").show();
		$('#loginName').focus();
	}
	else
	{
		if (gameData.gameNo == undefined || gameData.gameNo == 0)
		{
			$("#gameMenuOptions").html(buildGameMenuHtml());
			$(".menuView").show();
			$("#menuTitle").text("Hello, " + gameData.playerName);
		}
		else
		{
			$("#navPlayerName").text(gameData.playerName);
			$(".navbar").show();

			if (gameData.correctionFlag) {
				var i = gameData.gameStep - 1;
				$("#lblCorrectionSourceWord").text(gameData.source.words[i].word);
				$("#lblCorrectionWrongAnswers").html(buildNumberedHtmlList(gameData.source.words[i].wrongGiven));
				$("#lblCorrectionAnswer").text(gameData.source.words[i].answers[0]);
				$(".correctWordView").show();
			} else {
				if (gameData.gameStep >= gameData.source.words.length) { 	//game-over
					var r = buildResultScoresHtml();

					$("#resultScores").html(r.scoresHtml);
					$("#resultScoresTotal").html(r.scoresTotalHtml);
					if (r.isPass)
						$("#resultWinGraphic").show();
					else
						$("#resultLoseGraphic").show();
						
					$(".resultView").show();
					//postScore(gameData);
				} else {													//still playing
					$("#navbarTitle").text("Word Translation Game - " + gameData.source.name);
					$("#gameScreenTitle").text("Word #" + (gameData.gameStep + 1) + " of " + gameData.source.words.length + " words");
					$("#sourceWordLabel").text(gameData.source.words[gameData.gameStep].word);
					$("#retriesLeft").text(3 - gameData.tryCount);
					$('#inputWord').val("");
					$("#lblHintWord").text(gameData.source.words[gameData.gameStep].hint);
					$("#lblHintCategory").text(gameData.source.words[gameData.gameStep].category);
					$(".playView").show();
					$('#inputWord').focus();
				}
			}
		}
	}
}

function resetApp() {
	gameData = {
		playerName : "",
		gameNo : 0,
		gameStep : 0,
		tryCount : 0,
		correctionFlag : false
	}
	drawViews();
}

function getAppConfig(setupAppConfigCallback) {
	console.log("Getting app configuration from internet");
	var url = "https://api.myjson.com/bins/t27k";

	$.ajax({
		type: 'GET',
	    url: url,
	    timeout: 10000,
	    success: function( response ) {
	    	console.log("Got app configuration from internet");
			setupAppConfigCallback(response);
	    },
	    error: function(xhr, textStatus, errorThrown){
	    	console.log("Failed to get app config from internet - " + textStatus + ", error is: " + errorThrown);
	        alertify.error("Could not get app configurations - " + errorThrown);
	    }
	});
}

function configure() {
	console.log("Loading app configuration");
	getAppConfig(function(configs) {
		gAppConfig = configs;
		resetApp(gAppConfig);
	});
}


var gAppConfig;
var gameData;
var newGameSource;


$(window).on("load", function() {
	console.log("Window loaded");
	configure();
});

// HTML builder functions

function buildNumberedHtmlList(arr) {
	var html = "";
	var counter = 1;
	$.each(arr, function(index, value) { 
		html += counter++ + ". " + value + "</br>";
	});
	return html;
}

function buildGameMenuHtml() {
	var result = "";
	$.each(gAppConfig.games, function(index, value) { 
		result += "<a class=\"list-group-item menuOption\" onclick=\"startGame(" + (index + 1) + ");\"><span class=\"glyphicon glyphicon-play\" aria-hidden=\"true\" style=\"padding-right: 10px;\"></span>" + value.name + "</a>"
	});
	return result;
}

function buildResultScoresHtml() {
	const correctGlyph = "<span class=\"resultGlyph glyphicon glyphicon-ok\" aria-hidden=\"true\"></span>";
	const incorrectGlyph = "<span class=\"resultGlyph glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>";
	var scoreCount = 0, totalCount = 0;
	var scores = "", scoresTotal = "", isPass = false;

	$.each(gameData.source.words, function(index, value) { 
		totalCount++;
		var givenAnswer = "-";
		var glyphResult = "";
		if (value.score > 0) { 				//correct
			scoreCount += value.score;
			givenAnswer = value.given;	
			glyphResult = correctGlyph;
		} else {               				//incorrect
			givenAnswer = value.answers[0];
			glyphResult = incorrectGlyph;
		}
		
		scores += "<tr><td>" + value.word + "</td><td>" + givenAnswer + glyphResult + "</td><td>" + value.score + "</td></tr>";
	});

	var scorePerc = Math.round((scoreCount / totalCount) * 100, 0);
	scoresTotal += "<tr><td>Score</td><td>" + scorePerc + " %</td><td>" + scoreCount + "/" + totalCount + "</td></tr>";

	if (((scoreCount / totalCount) * 100) >= 50) {
		isPass = true;
	}

	var result = {
		scoresHtml : scores,
		scoresTotalHtml : scoresTotal,
		isPass : isPass
	}

	return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}