var App={
	
	
	
	//INITIALISATION
	
	//Function customisations
	/*
	initialise
	handleBackButton
	authenticateLogin
	loadListData
	buildList
	buildForm
	addFormItems
	submitForm
	validateForm
	processQueue
	uploadImageFile
	*/
	
	//Local storage name prefix
		prefix:'da',
		
	//Data lifetime value (ms)
		timeout:1800000,
		
	//Persistent variables
		data:{
			list:{},
			map:{},
			picker:{},
			signature:{},
			photo:{}
		},
		
	//HTML templates for repeaters
		template:{},
		
	//Text strings for prompts and alerts
		message:{
			logOutPrompt:'You will be logged out',
			invalidLogin:'Please enter a valid username and password',
			offlineUpdate:'Your deliveries will be updated next time your device is online',
			itemCompleted:'This delivery has been completed',
			noItems:'You have no deliveries scheduled',
			updateError:'Your deliveries could not be updated due to a server error',
			noMapAvailable:'Maps are not available for this delivery',
			noGeolocation:'Maps cannot be used offline or if location services are unavailable',
			googleError:'An error has occurred at Google Maps',
			locationError:'Your location cannot be determined',
			noCamera:'No camera is available',
			cancelForm:'Information you have entered for this delivery will be discarded',
			incompleteForm:'You must obtain a signature to save this delivery'
		},
		
	//Initialise application and show first page
		initialise:function(){
			//iOS status bar
				if(/constructor/i.test(window.HTMLElement))$('body').addClass('ios');
				else if(window.StatusBar)StatusBar.overlaysWebView(false);
			//HTML templates
				App.template.listItem=$('.list_items').html().replace(/\t|\r|\n/gi,'');
				App.template.formItem=$('.form_items').html().replace(/\t|\r|\n/gi,'');
				$('.form_items').html('-data-');
				App.template.itemForm=$('.item_form').html().replace(/\t|\r|\n/gi,'');
				App.template.directionStep=$('.directions_list').html().replace(/\t|\r|\n/gi,'');
			//Login form handler
				$('.login_form').on('submit',App.submitLogin);
			//First page
				App.showPage('.login_page');
				//App.loadListData();
				//App.buildForm(0);
		},	
	
	
	
	//UTILITIES
	
	//Show a page
		showPage:function(page,timer){
			if($('.active_page')[0]){
				if(timer==0){
					$('.active_page').hide();
					$('body').scrollTop(0);
					$('.active_page').removeClass('active_page');
					$(page).show().addClass('active_page');
				}
				else{
					$('.active_page').fadeOut(function(){
						$('body').scrollTop(0);
						$('.active_page').removeClass('active_page');
						$(page).fadeIn(function(){
							$(page).addClass('active_page');
						});
					});
				}
			}
			else $(page).fadeIn(function(){
				$(page).addClass('active_page');
			});
		},
		
	//Display notification or confirmation dialogue
		showMessage:function(type,text,process){
			if(type=='confirm')$('.confirm_button').show();
			else $('.confirm_button').hide();
			$('.error_page span.fa').not('.confirm_buttons span.fa').hide();
			$('.error_page span.icon_'+type).show();
			$('.error_text').html(text.replace(/\.\s\b/gi,'.<br/><br/>'));
			if(window.navigator.vibrate&&type=='error')window.navigator.vibrate(200);
			$('.error_page').removeClass('error confirm warning notification').addClass(type+' active_overlay').fadeIn(function(){
				if(typeof process=='function'&&type!='confirm')(process)();
				$(this).find('.close_button, .confirm_no').off().on('click',function(){
					$('.error_page').removeClass('active_overlay').fadeOut();
				});
				$(this).find('.confirm_yes').off().on('click',function(){
					(process)();
					$('.error_page').removeClass('active_overlay').fadeOut();
				});
			});
		},
		
	//Format date strings
		processDate:function(dateObj){
			if(typeof dateObj!='object'){
				var s=dateObj.split('/');
				dateObj=new Date();
				dateObj.setFullYear(s[2],parseInt(s[1])-1,s[0]);
			}
			dateObj.time=dateObj.getTime();
			dateObj.dd=parseInt(dateObj.getDate());
			dateObj.mm=parseInt(dateObj.getMonth()+1);
			dateObj.yyyy=dateObj.getFullYear();
			dateObj.hour=((dateObj.getHours()<10)?'0':'')+dateObj.getHours();
			dateObj.min=((dateObj.getMinutes()<10)?'0':'')+dateObj.getMinutes();
			dateObj.dateFormat=dateObj.dd+'/'+dateObj.mm+'/'+dateObj.yyyy;
			dateObj.shortDateFormat=dateObj.dd+'/'+dateObj.mm;
			dateObj.timeFormat=dateObj.hour+':'+dateObj.min;
			var d=['Su','Mo','Tu','We','Th','Fr','Sa'];
			dateObj.dayFormat=d[dateObj.getDay()];
			return dateObj;
		},
		
	//Generate natural language last update string from timestamp
		lastUpdateText:function(timestamp){
			var t=new Date().getTime(),
				m=Math.floor((t-timestamp)/60000),
				h=Math.floor((t-timestamp)/3600000),
				d=Math.floor((t-timestamp)/86400000),
				u='a few seconds ago';
			if(d>0)u=(d==1)?'yesterday':d+' days ago';
			else if(h>0)u=h+' hour'+((h>1)?'s':'')+' ago';
			else if(m>0)u=m+' minute'+((m>1)?'s':'')+' ago';
			return u;
		},
		
	//Intercept device back button
		handleBackButton:function(){
			if($('.active_overlay')[0]){
				$('.active_overlay').removeClass('active_overlay').fadeOut();
				return true;
			}
			if($('.login_page').hasClass('active_page')){
				navigator.app.exitApp();
				return true;
			}
			if($('.list_page').hasClass('active_page')){
				App.showMessage('confirm',App.message.logOutPrompt,App.logOut);
				return true;
			}
			if($('.form_page').hasClass('active_page')){
				App.cancelForm();
				return true;
			}
		},
	
	
	
	//LOGIN PAGE
	
	//Submit login form
		submitLogin:function(){
			var fail=false;
			if(!$('#user').val()||!$('#pass').val())fail=true;
			else{
				if(App.authenticateLogin()==true)App.loadListData();
				else fail=true;
			}
			if(fail)App.showMessage('error',App.message.invalidLogin);
			return false;
		},
		
	//Check login credentials
		authenticateLogin:function(){
			return true;
		},
	
	//Log out
		logOut:function(){
			App.showPage('.login_page',0);
		},
	
	
	
	//LIST PAGE
	
	//Load list data from server
		loadListData:function(force){
			if(window.navigator.onLine==true){
				if(new Date().getTime()>parseInt(window.localStorage.getItem(App.prefix+'-update-time'))+App.timeout||
					window.localStorage.getItem(App.prefix+'-update-time')==null||
					window.localStorage.getItem(App.prefix+'-data')==null||
					force==true){
						$.ajax({
							url:'https://www.multibaseit.com.au/da/manifest.aspx',
							dataType:'json',
							crossDomain:true,
							data:{
								time:new Date().getTime(),
								method:'get_manifest',
								driver_id:'1'
							},
							timeout:10000,
							success:function(data,status,request){
								App.storeLocalData(data);
							},
							error:function(request,status,error){
								App.showServerError(request,status,error);
							}
						});
				}
				else App.buildList();
			}
			else{
				if(!$('.error_page').hasClass('active_overlay'))App.showMessage('warning',App.message.offlineUpdate,App.buildList);
				else App.buildList();
			}
		},
		
	//Store loaded list data 
		storeLocalData:function(data){
			window.localStorage.setItem(App.prefix+'-data',JSON.stringify(data));
			window.localStorage.setItem(App.prefix+'-update-time',new Date().getTime());
			App.buildList();
		},
		
	//Generate list HTML
		buildList:function(){
			var l=JSON.parse(window.localStorage.getItem(App.prefix+'-data'));
			if(!$.isEmptyObject(l)){
				var i=0,s,h=[],d,n=new Date();
				n.setHours(0);
				n.setMinutes(0);
				n.setSeconds(0);
				while(i<Object.keys(l).length){
					d=App.processDate(l[i].Delivery.DeliveryDate);
					if(d.time>n.getTime()){
						c=(l[i].DeliveryStatus)?(' '+l[i].DeliveryStatus.toLowerCase()):'';
						s=App.template.listItem.split('-data-');
						h.push(
							s[0]+c+
							s[1]+i+
							s[2]+l[i].CustomerGeocode+
							s[3]+l[i].CustomerName+
							s[4]+l[i].CustomerSite+
							s[5]+l[i].CustomerID+
							s[6]+l[i].CustomerStreet+
							s[7]+l[i].Delivery.DeliveryTime+
							s[8]+l[i].Delivery.DeliveryInstructions+
							s[9]
						);
					}
					i++
				}
				$('.list_items').fadeIn().removeClass('filtered').html(h.join(''));
			//Bind events for list items
				$('.list_items .list_item').not('.pending,.submitted').each(function(){
					$(this).on('click',function(){
						App.buildForm($(this).attr('data-item-index'));
					});
					$(this).find('.item_map_link').on('click',function(){
						event.stopPropagation();
						App.validateMapData($(this).parent().attr('data-item-geocode'));
					});
				});
				$('.list_item.pending, .list_item.submitted').each(function(){
					$(this).on('click',function(){
						App.showMessage('error',App.message.itemCompleted);
					});
				});
			//Initialise list search
				$('#search_value').val('');
				$('.search_clear').hide();	
				$('.search_form').on('submit',function(){
					$('#search_value').blur();
					return false;
				});
				$('#search_value').off().on('input',App.filterList).val('');
				$('.search_clear').off().on('click',function(){
					$('#search_value').val('');
					App.filterList();
				});
			//Display list update time
				$('.list_update').off().on('click',App.forceListLoad);
				App.updateTime();
				$('.list_update .fa').removeClass('fa-spin');
				App.data.list.timer=setInterval(App.updateTime,60000);
			//Bind close button event
				$('.list_page > .close_button').off().on('click',function(){
					App.showMessage('confirm',App.message.logOutPrompt,App.logOut);
				});
			//Bind list toggle event
				$('.list_toggle').off().on('click',function(){
					if($('.list_item.pending,.list_item.submitted')[0]){
						App.data.list.toggled=!App.data.list.toggled;
						App.toggleList();
					}
				});
				App.toggleList();
			//Display list page
				if(!$('.list_page').hasClass('active_page')){
					if($('.error_page').hasClass('active_overlay'))App.showPage('.list_page',0);
					else App.showPage('.list_page');
				}
			//Trigger queued form process
				App.processQueue();
			}
			else if(!$('.error_page').hasClass('active_overlay'))App.showMessage('warning',App.message.noItems);
		},
		
	//Display last update time
		updateTime:function(){
			$('.update_time').html(App.lastUpdateText(parseInt(window.localStorage.getItem(App.prefix+'-update-time'))));
		},
		
	//Display server error message
		showServerError:function(request,status,error){
			var a=
				("Request = "+request.responseText)+
				("\nStatus = "+status)+
				("\nError = "+error);
			//alert(a);
			App.showMessage('error',App.message.updateError,App.buildList);
		},
		
	//Force reload from server
		forceListLoad:function(){
			if(window.navigator.onLine==true){
				$('.list_items').fadeOut();
				$('.list_update .fa').addClass('fa-spin');
				App.loadListData(true);
			}
			else App.showMessage('error',App.message.offlineUpdate);
		},
		
	//Search(filter) list
		filterList:function(){
			var s=$('#search_value')[0].value.trim().toLowerCase();
			if(s.length>1){
				$('.list_items').addClass('filtered');
				$('.list_item').each(function(){
					if($(this).text().toLowerCase().indexOf(s)<0)$(this).removeClass('filtered');
					else $(this).addClass('filtered');
				});
				$('.search_clear').show();
			}
			else{
				$('.list_items').removeClass('filtered');
				$('.filtered').removeClass('filtered');
				$('.search_clear').hide();
			}
		},
		
	//Validate map data
		validateMapData:function(destination){
			if(window.navigator.onLine==false||typeof window.navigator.geolocation!=='object'){
				App.showMessage('error',App.message.noGeolocation);
				return;
			}
			var s=destination.split(',');
			if(isNaN(s[0])||isNaN(s[1])){
				App.showMessage('error',App.message.noMapAvailable);
				return;
			}
			else{
				App.data.map.destination=destination;
				App.showMapPanel();
			}
		},
		
	//Show and hide map overlay
		showMapPanel:function(){
			$('#map_inner').empty();
			$('.map_icon').addClass('loading');
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.map_page').addClass('active_overlay').fadeIn();
			$('body').addClass('no_scroll');
			$('.map_page .close_button').off().on('click',App.hideMapPanel);
			if(typeof google==='undefined'||typeof google.maps==='undefined'){
				$('body').append('<script type="text/javascript" src="'+$('#google_script').attr('data-src')+'"></script>');
				App.verifyMapScript();
			}
			else App.getGeocode(App.initialiseMap);
		},
		hideMapPanel:function(){
			$('.map_page').removeClass('active_overlay').fadeOut(function(){
				$('body').removeClass('no_scroll');
				$('.map_icon').removeClass('loading');
				$('.map_text_link,.map_directions').hide().removeClass('active');
			});
		},
		
	//Reload Google scripts if unavailable
		verifyMapScript:function(){
			if(typeof google==='object'&&typeof google.maps==='object'){
				App.getGeocode(App.initialiseMap);
			}
			else window.setTimeout(App.verifyMapScript,500);
		},
		
	//Initialise map for directions
		initialiseMap:function(){
			if(!new RegExp('error','gi').test(App.data.map.origin)){
				a=App.data.map.origin.split(',');
				b=App.data.map.destination.split(',');
				var o=new google.maps.LatLng(parseFloat(a[0]),parseFloat(a[1])),
					d=new google.maps.LatLng(parseFloat(b[0]),parseFloat(b[1])),
					r={
						origin:o,
						destination:d,
						travelMode:'DRIVING'
					},
					s=new google.maps.DirectionsService();
				s.route(r,function(response,status){
					if(status=='OK'){
						$('.map_icon').removeClass('loading');
						$('.map_text_link').show().addClass('active');
						var m=new google.maps.Map($('#map_inner')[0],{
								disableDefaultUI:true,
								zoomControl:true,
								streetViewControl:true
							}),
							g=new google.maps.DirectionsRenderer();
						g.setDirections(response);
						g.setMap(m);
						App.getTextDirections(response.routes[0].legs[0]);
					}
					else if($('.map_page.active_overlay')[0])App.showMessage('error',App.message.googleError,App.hideMapPanel);
				});
			}
			else if($('.map_page').hasClass('active_overlay'))App.showMessage('error',App.message.noGeolocation,App.hideMapPanel);
		},
		
	//Get text directions from map result
		getTextDirections:function(directions){
			var h=[],a=App.template.directionStep.split('-data-');
			h.push(
				a[0]+directions.distance.text+' ('+directions.duration.text+')'+
				a[1]+
				a[2]
			);
			for(s in directions.steps){
				h.push(
					a[0]+directions.steps[s].instructions+
					a[1]+directions.steps[s].distance.text+
					a[2]
				)
			}
			$('.directions_list').html(h.join(''));
			$('.map_text_link').off().on('click',function(){
				$(this).toggleClass('active');
				if($(this).hasClass('active'))$('.map_directions').fadeOut();
				else $('.map_directions').fadeIn().scrollTop(0);
			});
		},
		
	//Get geocode from device
		getGeocode:function(process){
			if(typeof window.navigator.geolocation==='object'){
				window.navigator.geolocation.getCurrentPosition(
					function(position){
						App.data.map.origin=position.coords.latitude+','+position.coords.longitude;
						if(typeof process=='function')(process)();
					},
					function(error){
						App.data.map.origin='Error: '+error.message;
						if(typeof process=='function')(process)();
					},
					{
						timeout:20000
					}
				);
			}
			else App.showMessage('error',App.message.locationError);
		},
		
	//Add geocode value to form
		setGeocodeFormValue:function(){
			$('#form_geocode_value').val(App.data.map.origin);
			$('.location_check').hide();
			if(App.data.map.origin.indexOf('Error')==0)$('.location_error').show();
			else $('.location_captured').show();
		},
		
	//Toggle submitted list items
		toggleList:function(){
			if(App.data.list.toggled==true)$('.list_page').addClass('list_toggled');
			else $('.list_page').removeClass('list_toggled');
			if($.isEmptyObject($('.list_item.pending,.list_item.submitted')[0]))$('.list_toggle').addClass('inactive');
			else $('.list_toggle').removeClass('inactive');
		},
	
	
	
	//FORM PAGE
	
	//Generate item form
		buildForm:function(id){
			var f=JSON.parse(window.localStorage.getItem(App.prefix+'-data'))[id],
			s=App.template.itemForm.split('-data-'),
			h=[];
			h.push(
				s[0]+f.CustomerName+
				s[1]+f.CustomerSite+
				s[2]+App.processDate(f.Delivery.DeliveryDate).dateFormat+
				s[3]+f.Delivery.DeliveryTime+
				s[4]+f.Delivery.Invoice+
				s[5]+App.addFormItems(f.Delivery.DeliveryItems)+
				s[6]
			);
			$('.item_form').html(h.join(''));
			$('.delivery_total').html(App.data.picker.total);
		//Populate static form data
			App.getGeocode(App.setGeocodeFormValue);
			$('#form_invoice_value').val(f.Delivery.Invoice);
			$('#form_index_value').val(id);
		//Bind events for item quantity pickers
			$('.item_form .picker_quantity').on('activate',App.activatePicker).on('touchstart mousedown',function(event){
				event.preventDefault();
				$(this).trigger('activate');
			});
			$('.item_form .picker_less').each(function(){
				$(this).off().on('less',App.activatePickerLess).on('stop',App.deactivatePicker).on('touchstart mousedown',function(event){
					event.preventDefault();
					$(this).trigger('less');
				}).on('touchend mouseup',function(event){
					event.preventDefault();
					$(this).trigger('stop');
				});
			});
			$('.item_form .picker_more').each(function(){
				$(this).off().on('more',App.activatePickerMore).on('stop',App.deactivatePicker).on('touchstart mousedown',function(event){
					event.preventDefault();
					$(this).trigger('more');
				}).on('touchend mouseup',function(event){
					event.preventDefault();
					$(this).trigger('stop');
				});
			});
		//Bind signature events
			$('#form_sign_button').off().on('click',function(){
				$('.item_picker').removeClass('active');
				App.showSignaturePanel();
			});
			$('.signature_clear').off().on('click',function(){
				App.clearSignaturePanel();
			});
		//Bind camera events
			$('#form_photo_button').off().on('click',function(){
				$('.item_picker').removeClass('active');
				App.openCamera();
			});
			$('.photo_clear').off().on('click',function(){
				App.clearPhotoPanel();
			});
		//Bind form + submit events
			$('.item_form').off().on('submit',function(){
				return false;
			});
			$('#form_submit_button').off().on('click',App.submitForm);
		//Bind close button event
			$('.form_page > .close_button').off().on('click',App.cancelForm);
		//Display form page
			App.showPage('.form_page');
		},
		
	//Generate HTML for form items
		addFormItems:function(items){
			var s=App.template.formItem.split('-data-'),
			h=[],t=0;
			for(i=0;i<items.length;i++){
				h.push(
					s[0]+items[i].ProductCode+
					s[1]+items[i].ProductName+
					s[2]+items[i].ProductQuantity+
					s[3]+items[i].ProductQuantity+
					s[4]+i+
					s[5]+i+
					s[6]+items[i].ProductQuantity+
					s[7]+i+
					s[8]+i+
					s[9]
				);
				t+=parseInt(items[i].ProductQuantity);
			}
			App.data.picker.total=t;
			return h.join('');
		},
		
	//Activate item quantity picker for data entry
		activatePicker:function(){
			if($(this).parent().hasClass('delivery_quantity'))App.data.picker.activetype='delivery';
			else App.data.picker.activetype='return';
			if(!$(this).parent().hasClass('active')){
				$('.item_picker').removeClass('active');
				$(this).parent().addClass('active');
			}
			else{
				$(this).parent().removeClass('active');
			}
			$('.picker_active').finish().hide();
		},
		
	//Subtract from item picker quantity
		activatePickerLess:function(){
			$(this).siblings('input').val(Math.max(0,parseInt($(this).siblings('input').val())-1));
			var n=parseInt($(this).siblings('input').val());
			$(this).siblings('.picker_quantity').html(n);
			$(this).siblings('.picker_active').children(0).html(n);
			$(this).siblings('.picker_active').finish().fadeIn(0).show().delay(1000).fadeOut();
			App.setPickerTotal();
			App.data.picker.current=$(this);
			App.data.picker.timer=setTimeout(function(){
				$(App.data.picker.current).trigger('less');
			},200);
		},
		
	//Add to item picker quantity
		activatePickerMore:function(){
			var m=parseInt($(this).parent().attr('data-picker-max'))||99;
			$(this).siblings('input').val(Math.min(m,parseInt($(this).siblings('input').val())+1));
			var n=parseInt($(this).siblings('input').val());
			$(this).siblings('.picker_quantity').html(n);
			$(this).siblings('.picker_active').children(0).html(n);
			$(this).siblings('.picker_active').finish().fadeIn(0).show().delay(1000).fadeOut();
			App.setPickerTotal();
			App.data.picker.current=$(this);
			App.data.picker.timer=setTimeout(function(){
				$(App.data.picker.current).trigger('more');
			},200);
		},
		
	//Update picker total quantity
		setPickerTotal:function(){
			var t=0;
			$('.'+App.data.picker.activetype+'_quantity > input').each(function(){
				t+=parseInt($(this).val());
			});
			$('.'+App.data.picker.activetype+'_total').html(t);
		},
		
	//Deactivate repeated addition or subtraction for picker 
		deactivatePicker:function(){
			clearTimeout(App.data.picker.timer);
		},
		
	//Show signature overlay - https://github.com/szimek/signature_pad
		showSignaturePanel:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.signature_page .close_button').off().on('click',function(){
				$('.signature_page').fadeOut(function(){
					if(!App.data.signature.canvas.isEmpty()){
						$('#form_sign_value').val(App.data.signature.canvas.toDataURL());
						App.data.signature.canvas.clear();
						$('#form_sign_button').parent().addClass('completed');
					}
					else{
						$('#form_sign_value').val('');
						$('#form_sign_button').parent().removeClass('completed');
					}
				});
			});
			App.initialiseSignaturePanel();
			$('.signature_page').addClass('active_overlay').fadeIn();
		},
		
	//Resize signature canvas element
		initialiseSignaturePanel:function(){
			App.data.signature.canvas=document.querySelector('canvas#signature_image');
			var r=Math.max(window.devicePixelRatio||1,1);
			$(App.data.signature.canvas).width($(document).width())*r;
			$(App.data.signature.canvas).height($(document).height())*r;
			App.data.signature.canvas.width=$(document).width()*r;
			App.data.signature.canvas.height=$(document).height()*r;
			App.data.signature.canvas.getContext("2d").scale(r,r);
			App.data.signature.canvas=new SignaturePad(App.data.signature.canvas);
			if($('#form_sign_value').val()!='')App.data.signature.canvas.fromDataURL($('#form_sign_value').val());
		},
		
	//Clear signature panel
		clearSignaturePanel:function(){
			App.data.signature.canvas.clear();
		},
		
	//Open camera for form
		openCamera:function(){
			if(window.navigator.camera&&$('#form_photo_value').val()=='No photo captured'){
				window.navigator.camera.getPicture(
					function(filename){
						App.showCameraPanel(filename);
					},
					function(error){
						App.showMessage('error',error);
						$('#form_photo_button').parent().removeClass('completed');
					},
					{
						quality:50,
						destinationType:Camera.DestinationType.FILE_URI,
						correctOrientation:true,
						saveToPhotoAlbum:false
					}
				);
			}
			else if(window.navigator.camera&&$('#form_photo_value').val()!='No photo captured'){
				App.showCameraPanel($('#form_photo_value').val());
			}
			else App.showMessage('error',App.message.noCamera);
		},
		
	//Show camera panel for photo annotation
		showCameraPanel:function(filename){
			if(filename){
				$('#form_photo_value').val(filename);
				$('#form_photo_button').parent().addClass('completed');
			}
			if(!$('.photo_page').hasClass('active_overlay'))$('.active_overlay').removeClass('active_overlay').hide();
			if($('#form_photo_value').val()!='No photo captured')$('.photo_layout').css('background-image','url(\''+$('#form_photo_value').val()+'\')');
			$('.photo_page .close_button').off().on('click',function(){
				$('.photo_page').fadeOut(function(){
					if(!App.data.photo.canvas.isEmpty()){
						$('#form_annotation_value').val(App.data.photo.canvas.toDataURL());
						App.data.photo.canvas.clear();
					}
					else $('#form_annotation_value').val('No annotation entered');
				});
			});
			App.initialisePhotoPanel();
			$('.photo_page').addClass('active_overlay').fadeIn();
		},
		
	//Resize photo canvas element
		initialisePhotoPanel:function(){
			App.data.photo.canvas=document.querySelector('canvas#photo_image');
			var r=Math.max(window.devicePixelRatio||1,1);
			$(App.data.photo.canvas).width($(document).width())*r;
			$(App.data.photo.canvas).height($(document).height())*r;
			App.data.photo.canvas.width=$(document).width()*r;
			App.data.photo.canvas.height=$(document).height()*r;
			App.data.photo.canvas.getContext("2d").scale(r,r);
			App.data.photo.canvas=new SignaturePad(App.data.photo.canvas);
			App.data.photo.canvas.penColor='yellow';
			if($('#form_annotation_value').val()!='No annotation entered')App.data.photo.canvas.fromDataURL($('#form_annotation_value').val());
		},
		
	//Clear photo panel
		clearPhotoPanel:function(){
			App.data.photo.canvas.clear();
			$('#form_annotation_value').val('');
			$('#form_photo_value').val('No photo captured');
			$('.photo_layout').css('background-image','none')
			$('#form_photo_button').parent().removeClass('completed');
			App.openCamera();
		},
		
	//Close item form screen (cancel form)
		cancelForm:function(){
			App.showMessage('confirm',App.message.cancelForm,function(){
				App.loadListData();
			});
		},
		
	//Submit item form
		submitForm:function(){
			if(App.validateForm()==true){
				$('#form_timestamp_value').val(new Date().getTime());
				var f={};
				$('.item_form .form_buttons > input').not('button').each(function(){
					f[$(this).attr('id')]=$(this).val();
				});
				var a=[],i={};
				$('.form_item').each(function(){
					i={};
					i['item_code']=$(this).find('.item_code').html();
					i['item_name']=$(this).find('.item_name').html();
					i['quantity_delivered']=$(this).find('.delivery_quantity > input').val();
					i['quantity_returned']=$(this).find('.return_quantity > input').val();
					a.push(i);
				});
				f['form_items']=a;
				App.addQueueItem(f);
			}
			else App.showMessage('error',App.message.incompleteForm);
			return false;
		},
		
	//Validate item form data before submission
		validateForm:function(){
			var i=0;
			$('.item_form .hidden_field[data-required=true]').each(function(){
				if($(this).val()=='')return false;
				i++;
			});
			if(i==$('.item_form .hidden_field[data-required=true]').length)return true;
			return false;
		},
		
	//Add submission to processing queue and return to list page
		addQueueItem:function(item){
			var q;
			if(window.localStorage.getItem(App.prefix+'-queue')!=null){
				q=window.localStorage.getItem(App.prefix+'-queue').substring(0,window.localStorage.getItem(App.prefix+'-queue').lastIndexOf(']'))+','+JSON.stringify(item)+']';
			}
			else q='['+JSON.stringify(item)+']';
			window.localStorage.setItem(App.prefix+'-queue',q);
			App.updateItemStatus(item.form_index_value,'Pending',App.loadListData);
		},
		
	
	
	//FORM UPLOAD + QUEUE
	
	//Process form submission queue
		processQueue:function(){
			var q=$.makeArray(window.localStorage.getItem(App.prefix+'-queue'));
			if(q.length>0&&window.navigator.onLine==true){
				$.ajax({
					type:'POST',
					url:'https://www.multibaseit.com.au/da/process.aspx',
					dataType:'json',
					crossDomain:true,
					data:q[0],
					processData:false,
					success:function(data,status,request){
						App.processQueueResponse();
					},
					error:function(request,status,error){
						App.showServerError(request,status,error);
					}
				});
			}
		},
		
	//Process response and remove item from queue
		processQueueResponse:function(){
			var a=JSON.parse(window.localStorage.getItem(App.prefix+'-queue'));
			var i=a.shift();
			if(a.length>0)window.localStorage.setItem(App.prefix+'-queue',JSON.stringify(a));
			else window.localStorage.removeItem(App.prefix+'-queue');
			App.updateItemStatus(i.form_index_value,'Submitted',function(){
				App.uploadImageFile(
					i.form_photo_value,
					i.form_index_value+'-'+i.form_timestamp_value
				);
			});
		},
		
	//Update item status in stored list data
		updateItemStatus:function(id,status,process){
			var q=JSON.parse(window.localStorage.getItem(App.prefix+'-data'));
			q[id].DeliveryStatus=status;
			window.localStorage.setItem(App.prefix+'-data',JSON.stringify(q));
			$('.list_item[data-item-index='+(id)+']').removeClass('pending submitted').addClass(status.toLowerCase());
			if(typeof process=='function')(process)();
		},
		
	//Upload image file
		uploadImageFile:function(url,id){
			if(window.cordova&&url.indexOf(' ')<0){
				var o=new window.FileUploadOptions();
					o.fileKey="file";
					o.fileName=id+url.substr(url.lastIndexOf('.')+1);
					o.mimeType="image/jpeg";
					o.chunkedMode=false;
				var t=new window.FileTransfer();
				t.upload(
					url,
					'https://www.multibaseit.com.au/da/image.aspx',
					function(result){
						App.processUploadResult(result);
					},
					function(error){
						App.processUploadFailure(error);
					},
					o
				);
			}
			else App.processQueue();
		},
		
	//Process image upload success
		processUploadResult:function(result){
			var a=
				("Upload result code = "+result.responseCode)+
				("\nResponse = "+result.response)+
				("\nSent = "+result.bytesSent);
			//alert(a);
			App.processQueue();
		},
		
	//Process image upload failure
		processUploadFailure:function(error){
			var a=
				("Upload error code = "+error.code)+
				("\nUpload error source = "+error.source)+
				("\nUpload error http status = "+error.http_status)+
				("\nUpload error body = "+error.body)+
				("\nUpload error exception = "+error.exception)+
				("\nUpload error target = "+error.target);
			//alert(a);
			App.processQueue();
		}
};



function addDeviceEvents(){
	//Device back button
		document.addEventListener('backbutton',App.handleBackButton,false);
	//Device connection state
		document.addEventListener('online',App.processQueue,false);
	//Application focus
		document.addEventListener('resume',App.updateTime,false);
	//Initialisation
		$(document).ready(App.initialise);
}
if(window.cordova)document.addEventListener('deviceready',addDeviceEvents,false);
else $(document).ready(App.initialise);
