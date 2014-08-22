//Busco las variables de la URL con la función getVars() (definida más abajo)
var parameters = getVars();
// Variables Globales - Declaración
var	activeMedia, audios, authorizedToPlay = false, ek, gFlag = false, interval, isPlaying = false, isPlayingType, wasPlayed = false, mainStage, noAudioDuration,
	otherId = '', presentation, setMainsOk, SId, sldId, sliderDuration, fs_sliderDuration, slides, speakerBefore = 0, str, sv, volumeControl, fs_volumeControl,
	video;

str = parameters.play;
ek = parameters.ek;

//Variables del escenario (datos de la presentacion)
var 	_PresentationUserId, _PresentationId, _PresentationCode, _PresentationTitle, _CategoriaId, _PresentationStatus, _PresentationActiveData,
	_PresentationCreatedDate, _PresentationKeepStyle, _PresentationDescription, _PresentationProperties, _PresentationLeaveOff, _PresentationSkip,
	PresentationSkipBackwards, _PresentationPlaySlide, _PresentationColorTemplate, _PresentationBackground, _PresentationAllowComment, _TopicId,
	_PresentationShowMsgAllQuizzesApprobed, _PresentationMessageAllQuizzesApprobed, _PresentationPlaySlideOnlyOneTime,
	_PresentationShowMsgPlaySlideOneTime, _PresentationMessagePlaySlideOneTime, _PresentationMsgQuizSurveyDone, _PresentationSurveyMandatory,
	_PresentationContactTrainer, _PresentationDeadline, _PresentationDeadlineDate, _PresentationDeadlineIsDate, _PresentationDeadlineDays,
	_PresentationReceiveEmail, _PresentationPorcentajeVisto, _PresentationCompartir, _PresentationKeyWord, _PresentationDescriptionLink,
	_PresentationSlideCoverId, _PresentationPlayPresAfterFinished, _PresentationActivityLog, _PresentationActivityLogLastDate, _PresentationAprobPerc,
	_PresentationAllQuizzesApprobed, _PresentationAprobQuiz, _PresentationAprobSurvey, _PresentationEvent;

var sort_by = function(field, reverse, pr){
   var k = pr ? 
       function(x) {return pr(x[field])} : 
       function(x) {return x[field]};

   reverse = [-1, 1][+!!reverse];

   return function (a, b) {
       return a = k(a), b = k(b), reverse * ((a > b) - (b > a));
     } 
}

function _keepSession(){
	$.ajax({
		type: "POST",
		url: "../../aws_getPresentation_keepSession.aspx"
	}).done(function(){
		console.log('KeepSession ejecutado correctamente');
	}).fail(function(){
		console.log('No se pudo ejecutar KeepSession');
	})
}

/*
Todo lo que está adentro de $(document).ready() se ejecuta una vez que el DOM está listo para operar.
O sea, una vez que el HTML ya está generado. Así que todas las cargas y llamados a web services se
realizarán aquí adentro, para poder interactuar con los ID's fijos que están en las etiquetas HTML.
*/
$(document).ready(function(){
	getPresentationMains(); 		//Buscar la cabecera de la presentación
	getSlides(); 				//busca los slides
	_setMains();				//Setea los datos iniciales
	setInterval(_keepSession,20000);
	var nextVal = 0;
	var inter = setInterval(function(){
		nextVal = nextVal + 33.3; //En cada intervalo sumo 33.3 al valor numérico
		if (nextVal > 100) {
			$("#loader").animate({top:"-100%"},1000);
			authorizedToPlay= true;
		}
		if(authorizedToPlay){
			/*Agrego listeners sobre los elementos*/

			sliderDuration = document.getElementById('currentVideoTimeSlider');		//elemento HTML que contiene el tiempo transcurrido del slide
			fs_sliderDuration = document.getElementById('fs_currentVideoTimeSlider');	//elemento HTML que contiene el tiempo transcurrido del slide
			mainStage = document.getElementById('stageMain');				//elemento HTML que contiene el stage principal en donde se carga el contenido
			volumeControl = document.getElementById('volumeControl');			//elemento HTML que controla el volúmen de los videos / audios.
			fs_volumeControl = document.getElementById('fs_volumeControl');		//elemento HTML que controla el volúmen de los videos / audios.

			sliderDuration.addEventListener('change',videoSeek,false);			//listener que escucha si hay cambios en sliderDuration y ejecuta "videoSeek()" si los hay
			fs_sliderDuration.addEventListener('change',videoSeek,false);			//listener que escucha si hay cambios en sliderDuration y ejecuta "videoSeek()" si los hay
			volumeControl.addEventListener('change',changeVolume,false);		//listener que escucha si hay cambios en volumeControl y ejecuta "changeVolume()" si los hay
			fs_volumeControl.addEventListener('change',fs_changeVolume,false);		//listener que escucha si hay cambios en volumeControl y ejecuta "changeVolume()" si los hay
			
			var primerSlide = $('#slides .listItem:first-child'); //busco el primer slide
			primerSlide.startSlide(); //inicio el primer slide
			clearInterval(inter);
		}
	},1000)

	/*Funciones jQuery*/

	//Disparo el evento "StartSlide" en el click de un slide en la lista.
	$('.listItem').click(function(){
		var slideNow = $('.active').attr('data-order');
		var slideNext = $(this).attr('data-order');
		//Si existe SKIP O SKIP BACKWARDS
		if(_PresentationSkip || _PresentationSkipBackwards){
			//ES SKIP?
			if(_PresentationSkip){
				//Inicio el slide normalmente
				$(this).startSlide();
			}else{
				//ES BACKWARDS
				//Si el slide que quiero reproducir está antes que el actual puedo reproducirlo
				if(slideNext < slideNow){
					$(this).startSlide();
				}else{
					//Si no está antes que el actual, puede ser el siguiente
					if(slideNext-1 == slideNow){
						//Si es el siguiente y ya fue reproducido
						if(wasPlayed==true && isPlaying==false){
							$(this).startSlide();
						}else{
							//Falta reproducir el actual para avanzar
							new jBox('Notice',{
								content: 'You must finish this slide in order to advance',
								color: 'red'
							});
						}
					} else{
						//Esta queriendo avanzar a un slide que no es el siguiente, sino que está más adelante.
						new jBox('Notice',{
							content: 'You are only allowed to return towards previously played slides',
							color: 'red'
						});
					}
				}
			}
		}else{
			//SI NO HAY NINGUN SKIP
			//SI ES EVALUACION O ENCUESTA
			if($(this).attr('data-slidetype')=='Survey' || $(this).attr('data-slidetype')=='Quiz'){
				//SI EL ACTUAL YA SE REPRODUJO
				if(wasPlayed==true && isPlaying==false){
					$(this).startSlide();
				}else{
					//DEBE TERMINAR EL ACTUAL PARA PODER AVANZAR
					new jBox('Notice', {
						content: 'The slide must finish in order to advance',
						color: 'red'
					});
				}
			}else{
				//ES VIDEO / IMAGEN
				//SI EL ACTUAL ESTÁ REPRODUCIENDOSE
				if(isPlaying){
					new jBox('Notice', {
						content: 'The slide must finish in order to advance',
						color: 'red'
					});
				}else{
					//SI YA FUE REPRODUCIDO
					if(wasPlayed){
						//SI ES EL SIGUIENTE
						if((slideNext-1)==slideNow){
							$(this).startSlide();
						}else{
							new jBox('Notice', {
								content: 'You can only play the next consecutive Slide',
								color: 'red'
							});
						}
					}else{
						new jBox('Notice', {
							content: 'You must first play this slide in order to advance',
							color: 'red'
						});
					}
					
				}
			}
		}
	});
	$('#next').click(function(){
		if(_PresentationSkip){
			nextSlide();
		}else{
			if(isPlaying){
				new jBox('Notice', {
					content: 'The slide must finish in order to advance',
					color: 'red'
				});
			}else{
				if(wasPlayed){
					nextSlide();
				}else{
					new jBox('Notice', {
						content: 'You must first play this slide in order to advance',
						color: 'red'
					});
				}
				
			}
		}
	}); //Disparo el evento NextSlide en el click de la flecha Next.
	$('#previous').click(function(){
		if(_PresentationSkip){
			previousSlide();
		}else{
			if(isPlaying){
				new jBox('Notice', {
					content: 'The slide must finish in order to go back',
					color: 'red'
				});
			}else{
				if(wasPlayed){
					previousSlide();
				}else{
					new jBox('Notice', {
						content: 'You must first play this slide in order to go back',
						color: 'red'
					});
				}
				
			}
		}
	}); //Disparo el evento PreviousSlide en el click de la flecha Previous
	$('#eva-next').click(function(){nextSlide();}); //Disparo el evento NextSlide en el click de la flecha Next.
	$('#eva-previous').click(function(){previousSlide();}); //Disparo el evento PreviousSlide en el click de la flecha Previous
})

//Función que setea los datos de la cabecera en el stage.
function _setMains(){
	//Si los datos fueron traidos correctamente
	if(setMainsOk){
		//Le pongo el titulo a la pestaña del navegador
		document.title = presentation.PresentationTitle+' | EntrenarSE - Online Training Platform';
		//me guardo el titulo de la presentación
		_PresentationTitle = presentation.PresentationTitle;
		//Me guardo el tipo de reproducción (Automatica o Manual)
		_PresentationPlaySlide = presentation.PresentationPlaySlide;
		//Guardo el ID de usuario
		_PresentationUserId = presentation.PresentationUserId;
		//Guardo el modo Skip de la presentacion
		_PresentationSkip = presentation.PresentationSkip;
		//Guardo el Skip Backwards
		_PresentationSkipBackwards = presentation.PresentationSkipBackwards;
		//Muestro el titulo en el Stage
		$("#spanTitle").text(_PresentationTitle);
	}
}

//Función para ajustar el volumen
function changeVolume(){
	//la variable "video" es la variable global que contiene el video HTML5. ".volume" es el método que le aplica el nivel de volumen.
	//Como el volumen se mide en décimas entre 0 y 1 (0.1, 0.2, 0.3, etc...) al rango del slider (0-10) lo divido por 10 para obtener el volumen correcto.
	video.volume = volumeControl.value / 10;
	//Le doy al otro control de volumen el mismo valor
	fs_volumeControl.value = volumeControl.value;
}
//Función para ajustar el volumen en Full Screen
function fs_changeVolume(){
	//la variable "video" es la variable global que contiene el video HTML5. ".volume" es el método que le aplica el nivel de volumen.
	//Como el volumen se mide en décimas entre 0 y 1 (0.1, 0.2, 0.3, etc...) al rango del slider (0-10) lo divido por 10 para obtener el volumen correcto.
	video.volume = fs_volumeControl.value / 10;
	//Le doy al otro control de volumen el mismo valor
	volumeControl.value = fs_volumeControl.value;
}

//Función para limpar el escenario y cargar contenido nuevo.
//Cada vez que se clickea un slide, primero se limpia el contenido que haya y después se carga lo nuevo
function cleanStage(){
	$("#stageMain").empty();
	$(".fullscreenControls").css('display','none');
	$(".imgSlide").css('position','relative');
	$(".imgSlide").css('z-index','');
}

//Función que busca las columnas para armar la pregunta Grading de una evaluación
function columnSearch(i,j,k){
	//Inicializo las variables necesarias, todas vacías
	var htmlColumna = '';
	var htmlColumaOpciones = '';
	var htmlGrading = '';
	var htmlOpcionesGrading = '';
	//Por cada columna
	for (var h = 0; h < sv.Section[i].Question[j].Answer[k].GColumn.length; h++) {
		//Guardo el título de la columna y la cantidad de opciones que tiene
		var tituloColumna = sv.Section[i].Question[j].Answer[k].GColumn[h].ColumnTitle;
		var cantidadOpcionesColumna = sv.Section[i].Question[j].Answer[k].GColumn[h].ColumnOptions.length;
		//Por cada item para esa columna
		for (var n = 0; n < sv.Section[i].Question[j].Answer[k].GColumn[h].ColumnOptions.length; n++) {
			//Me guardo el titulo de la opción
			var columnOptionTitle = sv.Section[i].Question[j].Answer[k].GColumn[h].ColumnOptions[n].Title;
			//Concateno los títulos de los items horizontales
			htmlColumaOpciones += '<td class="tg-s6z2">'+columnOptionTitle+'</td>';
		};
		//Concateno las opciones verticales
		htmlColumna += '<th class="tg-jjml columnBG" colspan="'+cantidadOpcionesColumna+'">'+tituloColumna+'</th>';
	};
	//Por cada respuesta
	for (var f = 0; f < sv.Section[i].Question[j].Answer.length; f++) {
		//Guardo los valores
		var id = sv.Section[i].Question[j].Answer[f].ID;
		var aValue = sv.Section[i].Question[j].Answer[f].Value;
		var aTitle = sv.Section[i].Question[j].Answer[f].Title;
		//Empiezo a armar cada fila con todos sus checkboxes
		htmlOpcionesGrading += '<tr class="columnBG"><td class="tg-031e"><span data-answerid="'+id+'">'+aTitle+'</span></td>';
		//Por cada columna
		for (var h = 0; h < sv.Section[i].Question[j].Answer[f].GColumn.length; h++) {
			//Por cada opción de la misma
			for (var n = 0; n < sv.Section[i].Question[j].Answer[f].GColumn[h].ColumnOptions.length; n++) {
				var htmlCheck = '';
				var cValue = sv.Section[i].Question[j].Answer[f].GColumn[h].ColumnOptions[n].Value;
				var cId = sv.Section[i].Question[j].Answer[f].GColumn[h].ColumnOptions[n].ID;
				var caChecked = sv.Section[i].Question[j].Answer[f].GColumn[h].ColumnOptions[n].Checked;
				if(caChecked){
					htmlCheck = 'checked';
				}else{
					htmlCheck = '';
				}
				//Voy agregando cada checkbox a las opciones de las columnas
				htmlOpcionesGrading += '<td class="tg-s6z2"><input data-evarespregitemcod="'+cId+'" '+htmlCheck+' type="radio" name="'+sv.Section[i].Question[j].ID+'-'+aTitle+'" title="'+aTitle+'" value="'+cValue+'" /></td>';
			}
		};
		//Cierro toda la fila
		htmlOpcionesGrading += '</tr>';
	};
	//Concateno todos los strings que armé antes para formar la tabla definitiva
	htmlGrading = 	'<table class="tg">'+
			'<tr>'+
				'<th class="tg-031e" rowspan="2"></th>'+htmlColumna+
			'</tr>'+
			'<tr>'+htmlColumaOpciones+'</tr>'
	htmlGrading += htmlOpcionesGrading;
	//Cierro la tabla completa
	htmlGrading += '</table>';
	//Se la devuelvo a la función getSurvey()
	return htmlGrading;
}

//Acción al submitir una evaluación
function evaSubmit(){
	saveSection();
}

// función que busca la cabecera de la presentación en la base de datos.
function getPresentationMains(){
	/*Consulta*/
	var url = '../../aws_getpresentation_mains.aspx'
	var request = new XMLHttpRequest();
	request.open("POST", url, false);
	request.setRequestHeader("str", str);
	request.setRequestHeader("key", ek);
	request.send();
	if (request.status == 200) {
		/*Consulta exitosa*/
		//Guardo en la variable "presentation" el array de datos en formato JSON
		presentation = $.parseJSON(request.responseText);
		//Los datos se trajeron bien así que guardo en True el flag "setMainsOk"
		setMainsOk = true; 
	}else{
		/*Consulta fallida*/
		loadingError(request.statusText);
	}
}

//Función que trae los slides de la base de datos
function getSlides(){
	/*Consulta*/
	var url = '../../aws_getpresentation_slides.aspx'
	var request = new XMLHttpRequest();
	request.open("POST", url, false);
	request.setRequestHeader("str", str);
	request.setRequestHeader("key", ek);
	request.send();
	if (request.status == 200) {
		/*Consulta exitosa*/
		//Guardo en "slides" el array de datos en formato JSON
		slides = $.parseJSON(request.responseText);
		slides.sort(sort_by('PlayListOrder', true, parseInt));
		//Inicio la lista de los slides
		var html = '<ol class="list">';
		for (var i = 0; i < slides.length; i++) {
			//Agrego cada slide a la lista con sus respectivos valores
			html += '<li class="listItem" data-totalFrames="'+slides[i].TotalFrames+'" data-order="'+slides[i].PlayListOrder+'" data-resourcelocation="'+slides[i].SlideLocation+'" data-slideType="'+slides[i].SlideType+'" data-sldId="'+slides[i].PlayListSlideId+'" data-SId="'+slides[i].SId+'" data-trainer="'+slides[i].Speaker+'">'+slides[i].PlayListSlideName+'</li>';
		};
		//Cierro la lista de slides.
		html += '</ol>';
		//Asigno al contenedor la lista ya armada.
		$("#slides").html(html);
	}else{
		/*Consulta fallida*/
		loadingError(request.statusText);
	}
}

//Función que trae los speakers asociados a cada slide desde la base de datos.
function getSpeaker(speakerId){
	//Si el speaker no viene vacío
	if(speakerId!=0){
		//Controlo que el que estaba cargado antes no sea el mismo, si es el mismo no necesito cargar.
		if(speakerBefore!=speakerId){
			//Si son distintos me guardo en "before" el que voy a cargar ahora para tenerlo en el siguiente slide
			//y poder volver a comparar.
			speakerBefore = speakerId;
			//Consulto al servidor
			$.ajax({
				url: '../../aws_getpresentation_speaker.aspx',
				type: 'POST',
				headers: {
					'str':str,
					'key':ek,
					'speakerId': speakerId
				}
			}).done(function(data){
				var spk = $.parseJSON(data);

				var speakerName = spk.TrainerName+' '+spk.TrainerApellido;
				var speakerTitle = spk.TrainerTitle;
				var speakerBio = spk.TrainerBio;
				var speakerImg = spk.TrainerFotoURL;

				$("#speakerPhoto").html('<img alt="profile" src="'+speakerImg+'" />');
				$("#speakerName").text(speakerName);
				$("#speakerBio").text(speakerBio);
				$("#contactSpeakerTitle").text('Contact '+speakerName);
				$(".contactContainer").css('display','block');
			});
		}
	}else{
		//Si estoy aquí es porque el speaker para ese slide no estaba asignado. Muestro la foto de "Anonymous User"
		speakerBefore = 0;
		$("#speakerPhoto").html('<img alt="profile" src="img/avatar.png" />');
		$("#speakerName").text('Anonymous');
		$("#contactSpeakerTitle").css('display','none');
		$("#speakerBio").empty();
		$(".contactContainer").css('display','none');
	}
}

//Función que busca el Survey / Evaluación en la base de datos.
function getSurvey(SId){
	/*Consulta*/
	var url = '../../aws_getpresentation_surveyeva.aspx'
	var request = new XMLHttpRequest();
	request.open("POST", url, false);
	request.setRequestHeader("str", str);
	request.setRequestHeader("key", ek);
	request.setRequestHeader("SId",SId);
	request.send();
	if (request.status == 200) {
		/*Consulta exitosa*/
		//Guardo en "sv" el array de datos en formato JSON
		sv = $.parseJSON(request.responseText);
		var html = '';
		//ORDENO por el campo "Order" el JSON de la evaluación.
		sv.Section.sort(sort_by('Order', true, parseInt));
		//Por cada SECCIÓN
		for (var i = 0; i < sv.Section.length; i++) {
			var sId = sv.Section[i].ID;
			var sectionNumber = i + 1;
			html += '<ul class="sectionList" sectionnumber="'+sectionNumber+'" data-sectionId="'+sId+'">';
			html += '<li>';
			html += '<span class="sectionTitle">Page '+sv.Section[i].Order+'</span>';
			//Por cada PREGUNTA
			for (var j = 0; j < sv.Section[i].Question.length; j++) {
				var questionType = sv.Section[i].Question[j].QuestionType;
				var qId = sv.Section[i].Question[j].ID;
				var hasOther = sv.Section[i].Question[j].hasOther;
				var isRequired = sv.Section[i].Question[j].isRequired;
				var isMultiSelect = sv.Section[i].Question[j].IsMultiSelect;
				//Si es REQUIRED
				if(isRequired){
					html += '<span class="questionTitle isRequired" data-mselect="'+isMultiSelect+'" data-qtype="'+questionType+'" data-required="true" data-questionid="'+qId+'">'+sv.Section[i].Question[j].Title+'</span>';
				}else{
					html += '<span class="questionTitle" data-mselect="'+isMultiSelect+'" data-qtype="'+questionType+'" data-required="false" data-questionid="'+qId+'">'+sv.Section[i].Question[j].Title+'</span>';
				}
				html += '<div id="a-hold-'+sId+qId+'">';
				gFlag = false;
				//Por cada RESPUESTA
				for (var k = 0; k < sv.Section[i].Question[j].Answer.length; k++) {
					var aId = sv.Section[i].Question[j].Answer[k].ID;
					var aValue = sv.Section[i].Question[j].Answer[k].Value;
					var aText = sv.Section[i].Question[j].Answer[k].Title;
					var aChecked = sv.Section[i].Question[j].Answer[k].Checked;
					//Si aChecked == True, está respondida esta opción en la base de datos, la marco como tal
					if(aChecked==true){
						var htmlCheck = 'checked';
					}else{
						var htmlCheck = '';
					}
					//Si es Grading
					if(questionType==1){
						if(gFlag==false){
							var htmlGrading = columnSearch(i,j,k);
							html += htmlGrading;
							gFlag = true;
						}
					}
					//Si es multiple Choice
					if(questionType==2){
						if(isMultiSelect){
							html += '<input data-answerid="'+aId+'" '+htmlCheck+' type="checkbox" value="'+aValue+'" name="checkbox-'+sId+qId+'" id="a-'+sId+qId+aId+'" onchange="_showHideOther('+sId+qId+')" /><label for="a-'+sId+qId+aId+'">'+aText+'</label><br>';
						}else{
							html += '<input data-answerid="'+aId+'" '+htmlCheck+' type="radio" value="'+aValue+'" name="radiobutton-'+sId+qId+'" id="a-'+sId+qId+aId+'" onchange="_showHideOther('+sId+qId+')" /><label for="a-'+sId+qId+aId+'">'+aText+'</label><br>';
						}
					}
					//Si es Comment
					if(questionType==4){
						html += '<textarea data-answerid="'+aId+'" name="comment'+sId+qId+'" id="a-'+sId+qId+aId+'"></textarea>';
					}
				}
				//Si tiene opción "other"
				if(hasOther){
					if(questionType==2){
						html += '<input data-answerid="'+aId+'" '+htmlCheck+' type="radio" value="Other" name="radiobutton-'+sId+qId+'" id="a-'+sId+qId+'other" onchange="showHideOther('+sId+qId+')" /><label for="a-'+sId+qId+'other">Other</label><br>';
						html += '<textarea name="txt'+sId+qId+'" id="txt'+sId+qId+'" style="display:none;"></textarea>';
					}
				}
				html += '</div>';
			};
			html += '</li>';
			html += '</ul>';
		};
		//Me guardo la cantidad de secciones para hacer el paginado.
		var sLong = sv.Section.length;
		html += '<button id="evaprevbtn" onclick="prevEvaSection('+sLong+')"><< Previous</button>';
		html += '<button id="evanextbtn" onclick="nextEvaSection('+sLong+')">Next >></button>';
		html += '<button id="evasubmit" onclick="evaSubmit('+sLong+')">Submit</button>';
		$("#eva-stageMain").attr('data-sid',SId);
		$("#eva-stageMain").html(html);
		//Ejecuto función para configurar y armar las secciones.
		setSections(sLong);
	}else{
		//El request de datos fallo
		alert('Survey loading fail!');
	}
}

//Función para recuperar las variables de la URL
function getVars(){
	var url= location.search.replace("?", "");
	var arrUrl = url.split("&");
	var urlObj={};
	for(var i=0; i<arrUrl.length; i++){
		var x= arrUrl[i].split(":");
		urlObj[x[0]]=x[1];
	}
	//Este valor va a parar a la variable "parameters" en la primera línea del javascript
	return urlObj;
}

//Navegación de tabs del panel izquierdo
//Esta funcion se usa para cambiar entre el contenido de la presentacion, los commentarios y los handouts.
function goto(arg){
	//Ni bien se hace el click, oculto todos los tabs
	$("div.container#presentationContent").css('display','none');
	$("div.container#presentationComments").css('display','none');
	$("div.container#presentationDownloads").css('display','none');
	if(arg==1){
		//Si la selección fue 1, muestro los downloads
		$("div.container#presentationDownloads").css('display','block');
	}
	if(arg==2){
		//Si la selección fue 2, muestro los comments
		$("div.container#presentationComments").css('display','block');
	}
	if(arg==3){
		//Si la selección fue 3, muestro el contenido de la presentación (slides, speaker)
		//Esta es la selección por defecto
		$("div.container#presentationContent").css('display','block');
	}
}

//Funcion que se ejecuta para mostrar errores en la carga de datos.
function loadingError(errorMessage){
	alert('Error while loading the content: '+errorMessage);
}

//Función para avanzar a la siguiente sección de una evaluación / encuesta
function nextEvaSection(sLong){
	//Si está activa, guardo la section antes de avanzar a la siguiente página
	saveSection();
	//Cambio la sección activa
	$('.selected').next().addClass('selected');
	$('.selected').prev().removeClass('selected');
	//Vuelvo a ejecutar setSections para que organize y muestre el nuevo contenido
	setSections(sLong);
}

//Pasar al siguiente slide.
function nextSlide(){
	//Busco el slide siguiente al seleccionado.
	var slideSiguiente = $("#slides").find("li.active").next();
	//Le doy ventaja de 1 segundo al browser para que se acomode y pase al siguiente slide.
	//Al slide siguiente que ya tengo en la variable, le asigno el método "startSlide()"
	window.setTimeout(function(){slideSiguiente.startSlide()},1000);
}

//Función para reproducir y detener el slide.
function playPause(){
	//Si "noAudioDuration" es cero, quiere decir que hay contenido multimedia (audio o video) para reproducir
	if(noAudioDuration==0){
		var volumen = document.getElementById('volumeControl');
		video.volume = (volumen.value / 10);
		//Si el video está pausado/detenido
		if (video.paused){
			video.play(); //reproduzco
			isPlaying = true;
			console.log('isPlaying: '+isPlaying);
			$("#playPauseIcon").removeClass('fa-play').addClass("fa-pause"); //cambio el icono de play por el de pausa.
			$("#fs_playPauseIcon").removeClass('fa-play').addClass("fa-pause"); //cambio el icono de play por el de pausa.
			video.addEventListener('timeupdate',seekTimeUpdate,false); //Agrego un listener para ir actualizando el timer.
		} 
		else{
			//Si el video está reproduciendo
			video.pause(); //Pauso el video.
			$("#playPauseIcon").removeClass('fa-pause').addClass("fa-play"); //cambio el ícono de pausa a play neuvamente.
			$("#fs_playPauseIcon").removeClass('fa-pause').addClass("fa-play"); //cambio el ícono de pausa a play neuvamente.
		}
	}else{
		//Si entro a este else, es porque NO hay video o audio para reproducir, es solamente una imágen con tiempo asignado, pero nada de sonido.
		var tiempo = noAudioDuration; //Este es el tiempo que debe reproducirse la imagen
		var transcurrido = 1000; //Inicio el tiempo transcurrido en 1000 milisegundos.
		//Creo una función de intervalo sobre la variable "interval", para ejecutar cada 1 segundo y hacer que avance el timer.
		interval = setInterval(function(){
			//Si el tiempo transcurrido es menor al tiempo de duración
			if(transcurrido<=tiempo){
				$("#playPauseIcon").removeClass('fa-play').addClass("fa-pause"); //cambio el icono de play por el de pausa.
				$("#fs_playPauseIcon").removeClass('fa-play').addClass("fa-pause"); //cambio el icono de play por el de pausa.
				//Calculo los minutos y segundos.
				var curmins = Math.floor((transcurrido/1000) / 60);
				var cursecs = Math.floor((transcurrido/1000) - curmins * 60);
				var durmins = Math.floor((tiempo/1000) / 60);
				var dursecs = Math.floor((tiempo/1000) - durmins * 60);
				//Si los segundos o minutos son menores a diez, le agrego un cero delante al texto.
				if(cursecs < 10){ cursecs = "0"+cursecs; }
				if(dursecs < 10){ dursecs = "0"+dursecs; }
				if(curmins < 10){ curmins = "0"+curmins; }
				if(durmins < 10){ durmins = "0"+durmins; }
				//Creo el texto de tiempo transcurrido y tiempo total
				var _curTime = curmins+":"+cursecs
				var _durTime = durmins+":"+dursecs
				//Muestro los tiempos en pantalla.
				$(".currentTime").text(curmins+":"+cursecs);
				$(".videoDuration").text(durmins+":"+dursecs);
				//Actualizo la barra de progreso en la pantalla.
				sliderDuration.value = transcurrido * (1000 / tiempo);
				fs_sliderDuration.value = transcurrido * (1000 / tiempo);
				//Sumo un segundo para la siguiente vuelta.
				transcurrido += 1000;
			}else{
				//Si estoy aquí es porque el tiempo ya transcurrió por completo.
				//Freno el bucle con "clearInterval()", le paso por parametro la variable "interval" porque es la que debo frenar.
				clearInterval(interval);
				//Como ya transcurrió el tiempo, pregunto si la reproducción es automática. Si lo es, debo pasar al siguiente slide.
				//Para eso, ejecuto NextSlide().
				if(_PresentationPlaySlide=='A'){
					nextSlide();
				}
			}
		},1000); //Cantidad de milisegundos para volver a ejecutar el intervalo. Se declara siempre al terminar de declarar la función.
	}
}

function prevEvaSection(sLong){
	// if(_PresentationStatus=='A'){
		saveSection();
	// }
	$('.selected').prev().addClass('selected');
	$('.selected').next().removeClass('selected');
	setSections(sLong);
}
//Función para reproducir el slide anterior.
function previousSlide(){
	var slideSiguiente = $("#slides").find("li.active").prev(); //busco el slide previo al activo.
	//Le doy ventaja de 1 segundo al browser para que se acomode y pase al slide anterior.
	//Al slide anterior que ya tengo en la variable, le asigno el método "startSlide()"
	window.setTimeout(function(){slideSiguiente.startSlide()},1000);
}

//Función que vuelve a cero los relojes e íconos para reproducir contenido nuevo.
function resetTimer(){
	/*Pongo los contadores en cero*/
	$(".currentTime").text("00:00");
	$(".videoDuration").text("00:00");
	/*Pongo la barra de progress en cero*/
	sliderDuration.value = 0;
	fs_sliderDuration.value = 0;
	/*Reseteo el boton de play para que muestre si o si Play*/
	$("#playPauseIcon").removeClass('fa-pause').addClass("fa-play");
}

function saveSection(){
	var answerArray = '[';
	var surveyid = $("#eva-stageMain").attr('data-sid');
	$(".selected").find(".questionTitle").each(function(){
		var sId = $(".selected").attr('data-sectionId');
		var elemento = this;
		var qId = elemento.dataset.questionid;
		var isMS = 'false';
		var suma = 0;
		if(elemento.dataset.qtype==1){
			$("table.tg tbody tr.columnBG td.tg-031e").siblings().each(function(){
				var aId = $(this).parents('tr').children('.tg-031e').children('span').attr('data-answerid');
				$(this).find(':input').each(function(){
					if(this.checked){
						suma = suma + 1
						answerArray += '{ "SvEvaCodOrg" : "'+ surveyid+'",';
						answerArray += '"SvEvaCod" : "'+ surveyid+'",';
						answerArray += '"SvEvaPregCod" : "'+ qId+'",';
						answerArray += '"SvQuestionType" : '+elemento.dataset.qtype+',';
						answerArray += '"SvIsMultiSelect" : "'+isMS+'",';
						answerArray += '"SvTipSccCod" : "'+ sId+'",';
						answerArray += '"SvEvaResCod" : "'+suma+'",'; //Aumentar
						answerArray += '"SvEvaResPregItemCod" : "'+this.dataset.evarespregitemcod+'",';
						answerArray += '"SvEvaPregItemCod" : "'+aId+'",';
						answerArray += '"SvEvaResLevelCod" : "1",';
						answerArray += '"SvUserIdRes" : "'+ _PresentationUserId+'",';
						answerArray += '"SvEvaResComment" : "",';
						answerArray += '"SvCategCod" : "0"},';
					}
				})
			})
		}
		if(elemento.dataset.qtype==2){
			isMS = elemento.dataset.mselect;
			if(isMS=='true'){
				$("#a-hold-"+sId+qId).find(':input').each(function(){
					var respuesta = this;
					if(respuesta.checked){
						suma = suma + 1
						answerArray += '{ "SvEvaCodOrg" : "'+ surveyid+'",';
						answerArray += '"SvEvaCod" : "'+ surveyid+'",';
						answerArray += '"SvEvaPregCod" : "'+ qId+'",';
						answerArray += '"SvQuestionType" : '+elemento.dataset.qtype+',';
						answerArray += '"SvIsMultiSelect" : "'+isMS+'",';
						answerArray += '"SvTipSccCod" : "'+ sId+'",';
						answerArray += '"SvEvaResCod" : "1",';
						answerArray += '"SvEvaResPregItemCod" : "'+ respuesta.dataset.answerid+'",';
						answerArray += '"SvEvaPregItemCod" : "1",';
						answerArray += '"SvEvaResLevelCod" : "'+suma+'",'; //Aumentar
						answerArray += '"SvUserIdRes" : "'+ _PresentationUserId+'",';
						answerArray += '"SvEvaResComment" : "",';
						answerArray += '"SvCategCod" : "0"},';
					}
				});
				isMS = 'false';
			}else{
				$("#a-hold-"+sId+qId).find(':input').each(function(){
					var respuesta = this;
					if(respuesta.checked){
						answerArray += '{ "SvEvaCodOrg" : "'+surveyid+'",';
						answerArray += '"SvEvaCod" : "'+surveyid+'",';
						answerArray += '"SvEvaPregCod" : "'+qId+'",';
						answerArray += '"SvQuestionType" : '+elemento.dataset.qtype+',';
						answerArray += '"SvIsMultiSelect" : "'+isMS+'",';
						answerArray += '"SvTipSccCod" : "'+sId+'",';
						answerArray += '"SvEvaResCod" : "1",';
						answerArray += '"SvEvaResPregItemCod" : "'+respuesta.dataset.answerid+'",';
						answerArray += '"SvEvaPregItemCod" : "1",';
						answerArray += '"SvEvaResLevelCod" : "1",';
						answerArray += '"SvUserIdRes" : "'+_PresentationUserId+'",';
						answerArray += '"SvEvaResComment" : "",';
						answerArray += '"SvCategCod" : "0"},';
					}
				});
				isMS = 'false';
			}
		}
		if(elemento.dataset.qtype==4){
			$("#a-hold-"+sId+qId).find('textarea').each(function(){
				var respuesta = this;
				answerArray += '{ "SvEvaCodOrg" : "'+surveyid+'",';
				answerArray += '"SvEvaCod" : "'+surveyid+'",';
				answerArray += '"SvEvaPregCod" : "'+qId+'",';
				answerArray += '"SvQuestionType" : '+elemento.dataset.qtype+',';
				answerArray += '"SvIsMultiSelect" : "'+isMS+'",';
				answerArray += '"SvTipSccCod" : "'+sId+'",';
				answerArray += '"SvEvaResCod" : "1",';
				answerArray += '"SvEvaResPregItemCod" : "'+respuesta.dataset.answerid+'",';
				answerArray += '"SvEvaPregItemCod" : "1",';
				answerArray += '"SvEvaResLevelCod" : "1",';
				answerArray += '"SvUserIdRes" : "'+_PresentationUserId+'",';
				answerArray += '"SvEvaResComment" : "'+respuesta.value+'",';
				answerArray += '"SvCategCod" : "0"},';
			});
		}
	})
	var arrayCompleto = answerArray.substring(0, answerArray.length - 1);
	arrayCompleto += ']';
	$.ajax({
		type: "POST",
		headers: {
		  "key": ek,
		  "str": str
		},
		data: arrayCompleto,
		url: "../../aws_getpresentation_savesurvey.aspx",
		timeout: 10000
	}).done(function(){
		/*

		PASAR AL SIGUIENTE SLIDE

		*/
	}).fail(function(){
		alert("There was a communication problem, please try again.");
	});

}

//funcion que actualiza el tiempo de reproducción del video / audio
function seekTimeUpdate(){
	//"newTime" es el tiempo nuevo que tengo que mostrar.
	var newTime = video.currentTime * (1000 / video.duration);
	//Le paso el valor a la barra de progreso para que se actualice.
	sliderDuration.value = newTime;
	fs_sliderDuration.value = newTime;
	//Calculo los segundos y minutos que debo mostrar.
	var curmins = Math.floor(video.currentTime / 60);
	var cursecs = Math.floor(video.currentTime - curmins * 60);
	var durmins = Math.floor(video.duration / 60);
	var dursecs = Math.floor(video.duration - durmins * 60);
	//Si son menores a 10, les agrego un cero adelante.
	if(cursecs < 10){ cursecs = "0"+cursecs; }
	if(dursecs < 10){ dursecs = "0"+dursecs; }
	if(curmins < 10){ curmins = "0"+curmins; }
	if(durmins < 10){ durmins = "0"+durmins; }
	//Genero los textos de los valores.
	var _curTime = curmins+":"+cursecs
	var _durTime = durmins+":"+dursecs
	//Los muestro en pantalla.
	$(".currentTime").text(curmins+":"+cursecs);
	$(".videoDuration").text(durmins+":"+dursecs);
	//Como esta es la función que actualiza segundo a segundo el tiempo reproducido, voy a preguntar aca si ya terminó la reproducción
	//Esto lo hago comparando el tiempo transcurrido con el tiempo total, ya que no tengo forma de saber cuando termina un video con javascript.
	//Esto solo me interesa saberlo si la reproducción de slides es automática, puesto que debo detectar el final del contenido para
	//poder pasar al siguiente slide. entonces:
	//Si la reproducción es automática
	if(_PresentationPlaySlide=='A'){
		//Pregunto si el tiempo transcurrido ES IGUAL a la duración del contenido Y ADEMAS la duración es un número válido...
		//(esto del número válido lo pregunto también porque hay 2 momentos en los que los valores son iguales, al final de la reproducción,
		//cuando ambos valores estan en el punto más alto, y AL PRINCIPIO, cuando ambos valores son cero. Si yo no preguntara por números válidos
		//Va a saltar de slide indefinidamente, puesto que siempre va a encontrar igualdad en el inicio de la reproducción.)
		if(video.currentTime==video.duration && !isNaN(video.duration)){
			//Pauso el video.
			video.pause();
			//Vuelvo el tiempo a cero
			video.currentTime = 0;
			//Paso al siguiente slide
			nextSlide();
		}
	}
	var r = video.buffered.end(0);
	var total = video.duration;
	var nuevo = (r/total)*100;
	console.log('Bufer total: '+parseInt(nuevo));
	if(video.currentTime==video.duration){
		isPlaying = false;
		wasPlayed = true;
		$("#playPauseIcon").removeClass('fa-pause').addClass("fa-play"); //cambio el ícono de pausa a play neuvamente.
		$("#fs_playPauseIcon").removeClass('fa-pause').addClass("fa-play"); //cambio el ícono de pausa a play neuvamente.
		console.log('isPlaying: '+isPlaying);
	}
}

//funcion que setea las secciones
function setSections(sLong){
	//Busco cual es la seccion activa
	var sActive = $('.selected');
	//Pregunto si la activa es < > 0 o es igual. Si es igual, quiere decir que aún no se seleccionó ninguna sección. O sea, es la primera vez que imprimo
	//El survey o Evaluación.
	if(sActive.length==0){
		//Es cero, por lo tanto busco la primera sección para mostrar.
		$(".eva-stageMain ul:first-child").addClass("selected");
		//Si el rango de secciones es solamente 1, no tengo que mostrar boton next
		if(sLong==1){
			$("#evaprevbtn").css('display','none');
			$("#evasubmit").css('display','inline-block');
			$("#evanextbtn").css('display','none');
		}else{
			//Si hay más de 1 sección, como estoy mostrando la primera de todas, muestro el next y no el previous o submit.
			$("#evaprevbtn").css('display','none');
			$("#evasubmit").css('display','none');
			$("#evanextbtn").css('display','inline-block');
		}
	}else{
		//Es distinto de cero, por lo tanto, tengo varias secciones para mostrar. 
		//Busco la que tengo seleccionada.
		var selection = $(".selected").attr("sectionnumber");
		//Si es 1, estoy en la primera sección
		if(selection==1){
			$("#evaprevbtn").css('display','none');
			$("#evasubmit").css('display','none');
			$("#evanextbtn").css('display','inline-block');
		}else{
			//Si estoy aca, NO estoy en la primera seccion, pregunto si estoy en la última
			if(selection==sLong){
				//Estoy en la última sección, tengo que mostrar el previous y el submit.
				$("#evaprevbtn").css('display','inline-block');
				$("#evanextbtn").css('display','none');
				$("#evasubmit").css('display','inline-block');
			}else{
				//No es la última ni la primera sección, es una intermedia.
				//Muestro next y previous.
				$("#evaprevbtn").css('display','inline-block');
				$("#evanextbtn").css('display','inline-block');
				$("#evasubmit").css('display','none');
			}
		}
	}
}

//función que busca el audio de un slide.
function setSlideAudio(sldId){
	$.ajax({
		type: "POST",
		url: "../../aws_getslides_audio.aspx",
		headers: {
			"key" : ek,
			"str" : str,
			"SldId": sldId
		}
	}).done(function(data){
		//Consulta exitosa
		//Si NO DEVUELVE "ErrorAccess" quiere decir que SI SE ENCONTRÓ contenido de audio para el slide.
		if(data!='ErrorAccess'){
			//Pongo la variable noAudioDuration en cero porque es un Slide que SI TIENE audio y no la necesito
			//pero la tengo que poner en cero para que no interfiera en el conteo del timer.
			noAudioDuration = 0;
			//Cargo el audio a la pantalla (no es visible)
			$("#stageMain").append('<audio id="audio"><source src="'+data+'" /></audio>');
			//Me guardo el audio en una variable.
			video = document.getElementById('audio');
			if(_PresentationPlaySlide=='A'){
				//Si la reproducción es automática lo inicializo ejecutando playPause().
				playPause();
			}
		}else{
			//Si estoy aquí es porque el WebService me devolvió "ErrorAccess", eso quiere decir que NO hay audios para este slide.
			//Tengo que usar la duración seteada por el usuario en la imagen.
			for (var i = slides.length - 1; i >= 0; i--) {
				if(slides[i].PlayListSlideId==sldId){
					//Llego al slide que necesito y cargo la variable "noAudioDuration" con el valor en milisegundos de la duración del slide.
					noAudioDuration = (slides[i].TotalFrames / 30)*1000;
					//Calculo minutos y segundos.
					var durmins = Math.floor((noAudioDuration/1000) / 60);
					var dursecs = Math.floor((noAudioDuration/1000) - durmins * 60);
					//Si son menores a 10, les agrego un cero delante.
					if(dursecs < 10){ dursecs = "0"+dursecs; }
					if(durmins < 10){ durmins = "0"+durmins; }
					//Si la reproducción es automática, le doy playPause().
					if(_PresentationPlaySlide=='A'){
						playPause();
					}
				}
			}
			//Esto se pone en caso de que no sea reproducción automática, para resetear el timer.
			resetTimer();
		}
	});
}

//Función para mostrar la opción "Other" de la respuesta.
function showHideOther(id){
	if($("#a-"+id+"other").is(':checked')){
		$("#txt"+id).show();
	}
}

//Función para mostrar la opción "Other" de la respuesta.
function _showHideOther(id){
	$("#txt"+id).hide();
}

//Función que esconde y muestra el panel derecho y acomoda el stage en el centro o a la izquierda.
function toogleContainer(){
	if ($("#content").hasClass('animated')){
		$("#content").animate({right:'0'},"fast").removeClass('animated');
		$("#stage").removeClass('stageAligned');
		$("#stageMain").removeClass('inline-block');
	}else{
		$("#content").animate({right:'-22.5%'},"fast").addClass('animated');
		$("#stage").addClass('stageAligned');
		$("#stageMain").addClass('inline-block');
	}
}

//Función para mostrar a pantalla completa el slide.
function toogleFullScreen(){
	if (video.requestFullscreen) {
		if(isPlayingType=='video'){
			video.requestFullscreen();
		}else{
			if(isPlayingType=='img'){
				video.requestFullscreen();
				$(".imgSlide").css('position','absolute');
				$(".imgSlide").css('z-index','999999999');
			}
		}
		//mainStage.requestFullscreen();
		$(".fullscreenControls").css('display','block');
	}else if (video.mozRequestFullScreen) {
		if(isPlayingType=='video'){
			video.mozRequestFullScreen();
		}else{
			if(isPlayingType=='img'){
				video.mozRequestFullScreen();
				$(".imgSlide").css('position','absolute');
				$(".imgSlide").css('z-index','999999999');
			}
		}
		//mainStage.mozRequestFullscreen();
		$(".fullscreenControls").css('display','block');
	} else if (video.webkitRequestFullscreen) {
		if(isPlayingType=='video'){
			video.webkitRequestFullscreen();
		}else{
			if(isPlayingType=='img'){
				video.webkitRequestFullscreen();
				$(".imgSlide").css('position','absolute');
				$(".imgSlide").css('z-index','999999999');
			}
		}
		//mainStage.webkitRequestFullscreen();
		$(".fullscreenControls").css('display','block');
	}
}

//Función para retirar la pantalla completa desde el boton de los controles.
function quitFullScreen(){
	if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	}else{
		if(document.webkitCancelFullScreen){
			document.webkitCancelFullScreen();
		}else{
			document.exitFullscreen();
		}
	}
	$(".fullscreenControls").css('display','none');
	$(".imgSlide").css('position','relative');
	$(".imgSlide").css('z-index','');
}

//Función para detectar si se presiona ESC. Esta tecla sirve para salir de FullScreen, en cuyo caso hay que ocultar los controles FullScreen
//y mostrar nuevamente los controles estándares del reproductor.
$(document).keyup(function(event){
	//Si la tecla presionada es 27 (ESC)
	if(event.which==27){
		$(".fullscreenControls").css('display','none');
		$(".imgSlide").css('position','relative');
		$(".imgSlide").css('z-index','');
	}
});

//VideoSeek actualmente no se utiliza, pero es una función para seleccionar en la progress bar a que momento del video/audio se quiere ir.
function videoSeek(){
	var seekto = video.duration * (sliderDuration.value / 1000);
	video.currentTime = seekto;
}

/*---------------------------------------
METODOS JQUERY
---------------------------------------*/

//Función para inicializar slides. se puede usar como ".startSlide()" sobre una variable jQuery.
$.fn.startSlide = function startSlide(){
	//Cierro los intervalos en caso de que se haya estado reproduciendo una imagen sin sonido.
	clearInterval(interval);
	//limpio el stage.
	cleanStage();
	//Reseteo los relojes.
	resetTimer();
	//guardo en "slideTitle" el título de el slide sobre el que estoy parado.
	var slideTitle = $(this).html();
	var slideType = $(this).attr('data-slideType');
	var speakerId = $(this).attr('data-trainer');
	wasPlayed = false;
	//Si es de tipo VIDEO
	if(slideType == 'video'){
		isPlayingType = 'video';
		// se lo paso al titulo del stage
		$("#slideTitle").html(slideTitle);
		//agrego el elemento video a la pantalla.
		$("#stageMain").append('<video id="video"></video>');
		//guardo la URL del video (proc. genexus) en la variable "rl" (resource location).
		var rl = $(this).attr('data-resourcelocation');
		//le agrego al elemento video recien creado el source con la URL del video.
		$("#stageMain #video").append('<source src="'+rl+'" type="video/mp4; codecs='+"'avc1.42E01E, mp4a.40.2'"+'" />');
		//Lo ajusto al tamaño del stage.
		$("#video").css({'width':'100%','height':'100%'});
		//Me guardo en la variable video el identificador del elemento. A partir de ahora trabajo sobre la variable video el contenido.
		video = document.getElementById('video');
		$("#stage").animate({left:'0px'},'slow');
		$("#evaStage").animate({left:'-9999px'},'slow');
		if(_PresentationPlaySlide=='A'){
			noAudioDuration = 0;
			//Si es reproducción automática, lo largo con playPause().
			playPause();
		}
	}
	//Si es una IMAGEN
	if(slideType == 'normal'){
		isPlayingType = 'img';
		// se lo paso al titulo del stage
		$("#slideTitle").html(slideTitle);
		//guardo la URL de la imagen (proc. genexus) en la variable "rl" (resource location).
		var rl = $(this).attr('data-resourcelocation');
		//Me guardo el ID del slide.
		sldId = $(this).attr('data-sldId');
		//Pongo la imagen en pantalla.
		$("#stageMain").append('<img class="imgSlide" id="video" src="'+rl+'" />');
		$("#stage").animate({left:'0px'},'slow');
		$("#evaStage").animate({left:'-9999px'},'slow');
		//Me voy con el ID del slide a ver si tengo audio para esta imagen.
		setSlideAudio(sldId);
	}
	//Si es una EVALUACION / ENCUESTA
	if(slideType == 'Survey' || slideType == 'Quiz'){
		isPlayingType = 'quiz_sv';
		SId = $(this).attr('data-SId');
		// se lo paso al titulo del stage
		$("#eva-slideTitle").html(slideTitle);
		$("#stage").animate({left:'-9999px'},'slow');
		$("#evaStage").animate({left:'0px'},'slow');

		//Ejecuto la creación de la evaluacion / encuesta
		getSurvey(SId);
	}
	getSpeaker(speakerId);
	//Una vez que haya seteado todo el slide, busco entre todos los hermanos el que haya estado "activo" anteriormente, y le borro el estilo
	$(this).siblings().removeClass('active');
	//Luego, a este slide que estoy por reproducir lo resalto en verde en la lista para identificar que se está reproduciendo.
	$(this).addClass('active');
	//return false se pone para evitar que se envié algun resultado a la variable destino donde se ejecutó la función. no se necesita nada del otro lado.
	return false;
}