var DA={
	
	
	
	//INITIALISATION
	
	//Initialise application
		initialise:function(){
			//Back button
				document.addEventListener('backbutton',DA.handleBackButton,false);
			//Connection state
				document.addEventListener('online',DA.processQueue,false);
			//iOS
				if(/constructor/i.test(window.HTMLElement))$('body').addClass('ios');
			//Templates
				DA.template.manifestItem=$('.manifest_list').html().replace(/\t|\r|\n/gi,'');
				DA.template.deliveryItem=$('.delivery_items').html().replace(/\t|\r|\n/gi,'');
				$('.delivery_items').html('-data-');
				DA.template.deliveryForm=$('.delivery_form').html().replace(/\t|\r|\n/gi,'');
			//Login
				$('.login_form').on('submit',DA.submitLogin);
			//First page
				DA.showPage('.login_page');
				//DA.loadManifest();
				//DA.buildDeliveryForm(0);
		},
	//Persistent variables
		data:{
			manifest:{},
			map:{},
			picker:{},
			signature:{},
			photo:{}
		},
	//HTML templates for repeaters
		template:{},
	
	
	
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
			//$('body').addClass('no_scroll');
			if(window.navigator.vibrate&&type=='error')window.navigator.vibrate(200);
			$('.error_page').removeClass('error confirm warning notification').addClass(type+' active_overlay').fadeIn(function(){
				if(typeof process=='function'&&type!='confirm')(process)();
				$(this).find('.close_button, .confirm_no').off().on('click',function(){
					$('.error_page').removeClass('active_overlay').fadeOut();
					//$('body').removeClass('no_scroll');
				});
				$(this).find('.confirm_yes').off().on('click',function(){
					//$('body').removeClass('no_scroll');
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
			if($('.manifest_page').hasClass('active_page')){
				DA.showMessage('confirm','You will be logged out',DA.logOut);
				return true;
			}
			if($('.delivery_page').hasClass('active_page')){
				DA.cancelDelivery();
				return true;
			}
		},
	
	
	
	//LOGIN
	
	//Submit login credentials
		submitLogin:function(){
			var fail=false;
			if(!$('#user').val()||!$('#pass').val())fail=true;
			else{
				if(DA.authenticateLogin()==true)DA.loadManifest();
				else fail=true;
			}
			if(fail)DA.showMessage('error','Please enter a valid username and password');
			return false;
		},
	//Check login credentials
		authenticateLogin:function(){
			return true;
		},
		logOut:function(){
			DA.showPage('.login_page',0);
		},
	
	
	
	//MANIFEST LIST
	
	//Load manifest data
		loadManifest:function(force){
			if(window.navigator.onLine==true){
				if(new Date().getTime()>parseInt(window.localStorage.getItem('da-manifest-time'))+1800000||
					window.localStorage.getItem('da-manifest-time')==null||
					window.localStorage.getItem('da-manifest')==null||
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
								DA.storeLocalManifest(data);
							},
							error:function(request,status,error){
								DA.showServerError(request,status,error);
							}
						});
				}
				else DA.buildManifestList();
			}
			else{
				if(!$('.error_page').hasClass('active_overlay'))DA.showMessage('warning','Your manifest cannot be updated while your device is offline',DA.buildManifestList);
				else DA.buildManifestList();
			}
		},
	//Store loaded manifest data 
		storeLocalManifest:function(data){
			window.localStorage.setItem('da-manifest',JSON.stringify(data));
			window.localStorage.setItem('da-manifest-time',new Date().getTime());
			DA.buildManifestList();
		},
	//Display manifest data
		buildManifestList:function(){
			var m=JSON.parse(window.localStorage.getItem('da-manifest'));
			if(!$.isEmptyObject(m)){
				var i=0,s,h=[],d,n=new Date();
				n.setHours(0);
				n.setMinutes(0);
				n.setSeconds(0);
				while(i<Object.keys(m).length){
					d=DA.processDate(m[i].Delivery.DeliveryDate);
					if(d.time>n.getTime()){
						c=(m[i].DeliveryStatus)?(' '+m[i].DeliveryStatus.toLowerCase()):'';
						s=DA.template.manifestItem.split('-data-');
						h.push(
							s[0]+c+
							s[1]+i+
							s[2]+m[i].CustomerGeocode+
							s[3]+m[i].CustomerName+
							s[4]+m[i].CustomerSite+
							s[5]+m[i].CustomerID+
							s[6]+m[i].CustomerStreet+
							s[7]+m[i].Delivery.DeliveryTime+
							s[8]+m[i].Delivery.DeliveryInstructions+
							s[9]
						);
					}
					i++
				}
				$('.manifest_list').fadeIn().removeClass('manifest_list_filtered').html(h.join(''));
			//Bind events for manifest items
				$('.manifest_list .manifest_item').not('.pending,.submitted').each(function(){
					$(this).on('click',function(){
						DA.buildDeliveryForm($(this).attr('data-manifest-index'));
					});
					$(this).find('.manifest_map').on('click',function(){
						event.stopPropagation();
						DA.showMapPanel($(this).parent().attr('data-manifest-geocode'));
					});
				});
				$('.manifest_item.pending, .manifest_item.submitted').each(function(){
					$(this).on('click',function(){
						DA.showMessage('error','This delivery has been completed');
					});
				});
			//Manifest search
				$('#search_value').val('');
				$('.search_clear').hide();	
				$('.search_form').on('submit',function(){
					$('#search_value').blur();
					return false;
				});
				$('#search_value').off().on('input',DA.filterManifestList).val('');
				$('.search_clear').off().on('click',function(){
					$('#search_value').val('');
					DA.filterManifestList();
				});
			//Manifest update
				$('.manifest_update').off().on('click',DA.forceManifestLoad);
				$('.update_time').html(DA.lastUpdateText(parseInt(window.localStorage.getItem('da-manifest-time'))));
				$('.manifest_update .fa').removeClass('fa-spin');
				DA.data.manifest.timer=setInterval(function(){
					$('.update_time').html(DA.lastUpdateText(parseInt(window.localStorage.getItem('da-manifest-time'))));
				},60000);
			//Ready
				$('.manifest_toggle').off().on('click',function(){
					if($('.manifest_item.pending,.manifest_item.submitted')[0]){
						DA.data.manifest.toggled=!DA.data.manifest.toggled;
						DA.toggleManifestList();
					}
				});
				if(!$('.manifest_page').hasClass('active_page')){
					if($('.error_page').hasClass('active_overlay'))DA.showPage('.manifest_page',0);
					else DA.showPage('.manifest_page');
				}
				$('.manifest_page > .close_button').off().on('click',function(){
					DA.showMessage('confirm','You will be logged out',DA.logOut);
				});
				DA.toggleManifestList();
				DA.processQueue();
			}
			else if(!$('.error_page').hasClass('active_overlay'))DA.showMessage('warning','You have no scheduled deliveries');
		},
	//Check request result for errors
		showServerError:function(request,status,error){
			var a=
				("Request = "+request.responseText)+
				("\nStatus = "+status)+
				("\nError = "+error);
			//alert(a);
			DA.showMessage('error','Your manifest could not be updated',DA.buildManifestList);
		},
	//Force reload from server
		forceManifestLoad:function(){
			if(window.navigator.onLine==true){
				$('.manifest_list').fadeOut();
				$('.manifest_update .fa').addClass('fa-spin');
				DA.loadManifest(true);
			}
			else DA.showMessage('error','Your manifest cannot be updated while your device is offline');
		},
	//Search(filter) manifest list
		filterManifestList:function(){
			var s=$('#search_value')[0].value.trim().toLowerCase();
			if(s.length>1){
				$('.manifest_list').addClass('manifest_list_filtered');
				$('.manifest_item').each(function(){
					if($(this).text().toLowerCase().indexOf(s)<0)$(this).removeClass('manifest_item_filtered');
					else $(this).addClass('manifest_item_filtered');
				});
				$('.search_clear').show();
			}
			else{
				$('.manifest_list').removeClass('manifest_list_filtered');
				$('.manifest_item_filtered').removeClass('manifest_item_filtered');
				$('.search_clear').hide();
			}
		},
	//Show and hide map overlay
		showMapPanel:function(destination){
			if(window.navigator.onLine==true&&
				typeof window.navigator.geolocation==='object'&&
				typeof google==='object'&&
				typeof google.maps==='object'){
					$('#map_inner').empty();
					$('.map_icon').addClass('loading');
					$('.active_overlay').removeClass('active_overlay').hide();
					$('.map_page').addClass('active_overlay').fadeIn();
					$('.map_page .close_button').off().on('click',DA.hideMapPanel);
					if(parseInt(destination)+''!='NaN'){
						DA.data.map.destination=destination;
						DA.getGeocode(DA.initialiseMap);
					}
					else DA.showMessage('error','Maps are not available for this delivery',DA.hideMapPanel);
			}
			else{
				DA.showMessage('error','Maps cannot be used when your device is offline or location is turned off');
			}
		},
		hideMapPanel:function(){
			$('.map_page').removeClass('active_overlay').fadeOut(function(){
				$('.map_icon').removeClass('loading');
			});
		},
	//Initialise map for directions
		initialiseMap:function(){
			if(!new RegExp('error','gi').test(DA.data.map.origin)){
				a=DA.data.map.origin.split(',');
				b=DA.data.map.destination.split(',');
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
						var m=new google.maps.Map($('#map_inner')[0],{
								disableDefaultUI:true,
								zoomControl:true,
								streetViewControl:true
							}),
							g=new google.maps.DirectionsRenderer();
						g.setDirections(response);
						g.setMap(m);
					}
					else if($('.map_page.active_overlay')[0])DA.showMessage('error','An error has occurred at Google Maps',DA.hideMapPanel);
				});
			}
			else if($('.map_page.active_overlay')[0])DA.showMessage('error','Maps cannot be used when your device is offline or location is turned off',DA.hideMapPanel);
		},
	//Get geocode from device or Google API
		getGeocode:function(process){
			if(typeof window.navigator.geolocation==='object'){
				window.navigator.geolocation.getCurrentPosition(
					function(position){
						DA.data.map.origin=position.coords.latitude+','+position.coords.longitude;
						if(typeof process=='function')(process)();
					},
					function(error){
						DA.data.map.origin='Error: '+error.message;
						if(typeof process=='function')(process)();
					},
					{
						timeout:20000
					}
				);
			}
			else DA.showMessage('error','Your location cannot be determined');
		},
	//Add geocode value to delivery form
		setGeocodeFormValue:function(){
			$('#delivery_geocode_value').val(DA.data.map.origin);
			$('.location_check').hide();
			if(DA.data.map.origin.indexOf('Error')==0)$('.location_error').show();
			else $('.location_captured').show();
		},
	//Toggle submitted deliveries in manifest
		toggleManifestList:function(){
			if(DA.data.manifest.toggled==true)$('.manifest_page').addClass('manifest_toggled');
			else $('.manifest_page').removeClass('manifest_toggled');
			if($.isEmptyObject($('.manifest_item.pending,.manifest_item.submitted')[0]))$('.manifest_toggle').addClass('inactive');
			else $('.manifest_toggle').removeClass('inactive');
		},
	
	
	
	//DELIVERY FORM
	
	//Generate HTML for delivery form
		buildDeliveryForm:function(id){
			//Form data
				var m=JSON.parse(window.localStorage.getItem('da-manifest'))[id],
				s=DA.template.deliveryForm.split('-data-'),
				h=[];
				h.push(
					s[0]+m.CustomerName+
					s[1]+m.CustomerSite+
					s[2]+DA.processDate(m.Delivery.DeliveryDate).dateFormat+
					s[3]+m.Delivery.DeliveryTime+
					s[4]+m.Delivery.Invoice+
					s[5]+DA.addDeliveryItems(m.Delivery.DeliveryItems)+
					s[6]
				);
				$('.delivery_form').html(h.join(''));
			//Geocode field
				DA.getGeocode(DA.setGeocodeFormValue);
			//Ready
				$('#delivery_invoice_value').val(m.Delivery.Invoice);
				$('#delivery_index_value').val(id);
				$('.delivery_form .picker_quantity').on('activate',DA.activateDeliveryPicker).on('click',function(){
					$(this).trigger('activate');
				});
				$('.delivery_form .picker_less').each(function(){
					$(this).off().on('less',DA.activatePickerLess).on('stop',DA.deactivatePicker).on('touchstart mousedown',function(event){
						event.preventDefault();
						$(this).trigger('less');
					}).on('touchend mouseup',function(event){
						event.preventDefault();
						$(this).trigger('stop');
					});
				});
				$('.delivery_form .picker_more').each(function(){
					$(this).off().on('more',DA.activatePickerMore).on('stop',DA.deactivatePicker).on('touchstart mousedown',function(event){
						event.preventDefault();
						$(this).trigger('more');
					}).on('touchend mouseup',function(event){
						event.preventDefault();
						$(this).trigger('stop');
					});
				});
				$('#delivery_sign').on('click',function(){
					$('.item_picker').removeClass('active');
					DA.showSignaturePanel();
				});
				$('#delivery_photo').on('click',function(){
					$('.item_picker').removeClass('active');
					DA.openCamera();
				});
				$('.delivery_form').on('submit',function(){
					return false;
				});
				$('#delivery_submit').off().on('click',DA.submitDelivery);
				$('.delivery_page > .close_button').off().on('click',DA.cancelDelivery);			
				DA.showPage('.delivery_page');
		},
	//Add delivery items to delivery form
		addDeliveryItems:function(items){
			var s=DA.template.deliveryItem.split('-data-'),
			h=[];
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
			}
			return h.join('');
		},
	//Activate delivery picker for data input
		activateDeliveryPicker:function(){
			if(!$(this).parent().hasClass('active')){
				$('.item_picker').removeClass('active');
				$(this).parent().addClass('active');
			}
			else{
				$(this).parent().removeClass('active');
			}
			$('.picker_active').finish().hide();
		},
	//Subtract quantity from delivery picker
		activatePickerLess:function(){
			$(this).siblings('input').val(Math.max(0,parseInt($(this).siblings('input').val())-1));
			$(this).siblings('.picker_quantity').html($(this).siblings('input').val());
			$(this).siblings('.picker_active').children(0).html($(this).siblings('input').val());
			$(this).siblings('.picker_active').finish().fadeIn(0).show().delay(1000).fadeOut();
			DA.data.picker=$(this);
			DA.data.picker.timer=setTimeout(function(){
				$(DA.data.picker).trigger('less');
			},200);
		},
	//Add quantity to delivery picker
		activatePickerMore:function(){
			var m=parseInt($(this).parent().attr('data-picker-max'))||99;
			$(this).siblings('input').val(Math.min(m,parseInt($(this).siblings('input').val())+1));
			$(this).siblings('.picker_quantity').html($(this).siblings('input').val());
			$(this).siblings('.picker_active').children(0).html($(this).siblings('input').val());
			$(this).siblings('.picker_active').finish().fadeIn(0).show().delay(1000).fadeOut();
			DA.data.picker=$(this);
			DA.data.picker.timer=setTimeout(function(){
				$(DA.data.picker).trigger('more');
			},200);
		},
	//Deactivate repeated addition or subtraction for picker 
		deactivatePicker:function(){
			clearTimeout(DA.data.picker.timer);
			DA.data.picker.timer=null;
			DA.data.picker=null;
		},
	//Show signature panel for delivery form - https://github.com/szimek/signature_pad
		showSignaturePanel:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.signature_page .close_button').off().on('click',function(){
				$('.signature_page').fadeOut(function(){
					if(!DA.data.signature.canvas.isEmpty()){
						$('#delivery_sign_value').val(DA.data.signature.canvas.toDataURL());
						DA.data.signature.canvas.clear();
						$('#delivery_sign').parent().addClass('completed');
					}
					else{
						$('#delivery_sign_value').val('');
						$('#delivery_sign').parent().removeClass('completed');
					}
				});
			});
			$('.signature_page').addClass('active_overlay').fadeIn(function(){
				DA.initialiseSignaturePanel();
			});
		},
	//Resize signature canvas element
		initialiseSignaturePanel:function(){
			DA.data.signature.canvas=document.querySelector('canvas#signature_image');
			$(DA.data.signature.canvas).width($(document).width());
			$(DA.data.signature.canvas).height($(document).height());
			DA.data.signature.canvas.width=$(document).width();
			DA.data.signature.canvas.height=$(document).height();
			DA.data.signature.canvas=new SignaturePad(DA.data.signature.canvas);
		},
	//Open camera for delivery form
		openCamera:function(){
			if(window.navigator.camera){
				window.navigator.camera.getPicture(
					function(filename){
						$('#delivery_photo_value').val(filename);
						$('#delivery_photo').parent().addClass('completed');
						DA.showCameraPanel();
					},
					function(error){
						DA.showMessage('error',error);
						$('#delivery_photo').parent().removeClass('completed');
					},
					{
						quality:50,
						destinationType:Camera.DestinationType.FILE_URI,
						correctOrientation:true,
						saveToPhotoAlbum:false
					}
				);
			}
			else DA.showCameraPanel();
		},
	//Show camera panel for photo annotation
		showCameraPanel:function(){
			$('.active_overlay').removeClass('active_overlay').hide();
			$('.photo_layout').css('background-image','url(\''+$('#delivery_photo_value').val()+'\')');
			$('.photo_page .close_button').off().on('click',function(){
				$('.photo_page').fadeOut(function(){
					if(!DA.data.photo.canvas.isEmpty()){
						$('#delivery_annotation_value').val(DA.data.photo.canvas.toDataURL());
						DA.data.photo.canvas.clear();
					}
					else $('#delivery_annotation_value').val('');
				});
			});
			$('.photo_page').fadeIn(function(){
				DA.initialisePhotoPanel();
			});
		},
	//Resize photo canvas element
		initialisePhotoPanel:function(){
			DA.data.photo.canvas=document.querySelector('canvas#photo_image');
			$(DA.data.photo.canvas).width($(document).width());
			$(DA.data.photo.canvas).height($(document).height());
			DA.data.photo.canvas.width=$(document).width();
			DA.data.photo.canvas.height=$(document).height();
			DA.data.photo.canvas=new SignaturePad(DA.data.photo.canvas);
			DA.data.photo.canvas.penColor='yellow';
		},
	//Close delivery screen (cancel)
		cancelDelivery:function(){
			DA.showMessage('confirm','Information have entered on this screen will be discarded',function(){
				DA.loadManifest();
			});
		},
	//Submit delivery data
		submitDelivery:function(){
			if(DA.validateDelivery()==true){
				$('#delivery_timestamp_value').val(new Date().getTime());
				var f={};
				$('.delivery_form .form_buttons > input').not('button').each(function(){
					f[$(this).attr('id')]=$(this).val();
				});
				var a=[],i={};
				$('.delivery_item').each(function(){
					i={};
					i['item_code']=$(this).find('.item_code').html();
					i['item_name']=$(this).find('.item_name').html();
					i['quantity_delivered']=$(this).find('.delivery_quantity > input').val();
					i['quantity_returned']=$(this).find('.return_quantity > input').val();
					a.push(i);
				});
				f['delivery_items']=a;
				DA.addQueueItem(f);
			}
			else DA.showMessage('error','Please complete this form before saving');
			return false;
		},
	//Validate delivery data before submission
		validateDelivery:function(){
			var i=0;
			$('.delivery_form .hidden_field[data-required=true]').each(function(){
				if($(this).val()=='')return false;
				i++;
			});
			if(i==$('.delivery_form .hidden_field[data-required=true]').length)return true;
			return false;
		},
	//Add submission to processing queue and return to manifest page
		addQueueItem:function(item){
			var q;
			if(window.localStorage.getItem('da-queue')!=null){
				q=window.localStorage.getItem('da-queue').split(']')[0]+','+JSON.stringify(item)+']';
			}
			else q='['+JSON.stringify(item)+']';
			window.localStorage.setItem('da-queue',q);
			DA.updateDeliveryStatus(item.delivery_index_value,'Pending',DA.loadManifest);
		},
		
	
	
	//DELIVERY UPLOAD + QUEUE
	
	//Process delivery submission queue
		processQueue:function(){
			var q=$.makeArray(window.localStorage.getItem('da-queue'));
			if(q.length>0&&window.navigator.onLine==true){
				$.ajax({
					type:'POST',
					url:'https://www.multibaseit.com.au/da/process.aspx',
					dataType:'json',
					crossDomain:true,
					data:q[0],
					processData:false,
					success:function(data,status,request){
						DA.processQueueResponse();
					},
					error:function(request,status,error){
						DA.showServerError(request,status,error);
					}
				});
			}
		},
	//Process response and remove delivery from queue
		processQueueResponse:function(){
			var a=JSON.parse(window.localStorage.getItem('da-queue'));
			var i=a.shift();
			if(a.length>0)window.localStorage.setItem('da-queue',JSON.stringify(a));
			else window.localStorage.removeItem('da-queue');
			DA.updateDeliveryStatus(i.delivery_index_value,'Submitted',function(){
				DA.uploadImageFile(
					i.delivery_photo_value,
					i.delivery_index_value+'-'+i.delivery_timestamp_value
				);
			});
		},
	//Update delivery status in stored manifest data
		updateDeliveryStatus:function(id,status,process){
			var m=JSON.parse(window.localStorage.getItem('da-manifest'));
			m[id].DeliveryStatus=status;
			window.localStorage.setItem('da-manifest',JSON.stringify(m));
			$('.manifest_item[data-manifest-index='+(id)+']').removeClass('pending submitted').addClass(status.toLowerCase());
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
						DA.processUploadResult(result);
					},
					function(error){
						DA.processUploadFailure(error);
					},
					o
				);
			}
			else DA.processQueue();
		},
	//Process image upload success
		processUploadResult:function(result){
			var a=
				("Upload result code = "+result.responseCode)+
				("\nResponse = "+result.response)+
				("\nSent = "+result.bytesSent);
			//alert(a);
			DA.processQueue();
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
			DA.processQueue();
		}
};
document.addEventListener('deviceready',$(DA.initialise),false);