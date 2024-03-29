'use strict';

//global variable that keeps track of the number of results that get rendered
var resultsCount=0;

//MAKEINPUTAUTOCOMPLETE FUNCTION - uses google maps api to autocomplete an address #autocomplete 
//input field 
function makeInputAutocomplete(){
    let input = new google.maps.places.Autocomplete(document.getElementById('autocomplete'));
}

//WATCHFORMSUBMIT FUNCTION - when form is submitted, creates the variable userInput and sets it equal
//to the address input
function watchFormSubmit(){
    $('form').submit(function(event){
        event.preventDefault();
        let userInput = $('#autocomplete').val();
        //calls getCoordinates function, which will take input and get the coordinates
        getCoordinates(userInput,this);
    })
}

//SUBMITFUNCTIONDISABLED FUNCTION - when the user clicks submit button and disables it,
//creates a reset button
function submitButtonDisabled(form){
    //disable submit button so user cannot double click
    form.submit.disabled=true;
    form.submit.value='Please wait...';
    $('.formButtonContainer').append('<input class="reset" type="button" value="Reset">');
    form.submit.style.width='50%';
    //when the reset button is clicked, reset the form, undisable submit button 
    //and remove reset button
    $('.reset').click(function(event){
        event.preventDefault();
        form.reset();
        form.submit.disabled=false;
        form.submit.value='Submit';
        $('.reset').remove();
        form.submit.style.width='100%';
    })
}


//GETCOORDINATES FUNCTION - takes the address (userInput) and obtains its lat and long coordinates
//using google maps geocoder API
function getCoordinates(userInput,form){
    let geocoder = new google.maps.Geocoder();
    let results = {
        address: userInput
    };
    //callback function
    let callback = function(results,status){ 
        //if user does not provide any input, calls noInputGiven function
        if (status == google.maps.places.PlacesServiceStatus.INVALID_REQUEST){
            noInputGiven();
        }
        //if the user provides an input, but it is not a valid address, calls invalidAddressGiven function
        if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS){
            invalidAddressGiven(form);
        }
        //if status is OK (valid address & no errors), obtain lat and long coordinates 
        if (status == google.maps.places.PlacesServiceStatus.OK){
            submitButtonDisabled(form);
            let resultLat = results[0].geometry.location.lat();
            let resultLong=  results[0].geometry.location.lng(); 
            //calls getResults function, which will get list of nearby restaurants
            getResults(resultLat, resultLong,userInput,form);
        }
        //if there is an error, alert the user
        if(status == 'ERROR'){
            alert('There was an error retrieving the data. Please check your internet connection or try again later.')
        }
    } 
    geocoder.geocode(results,callback);
}

//NOINPUTGIVEN FUNCTION - if the user presses submit without any input, shows the .noInputError message
function noInputGiven(){
    $('.noInputError').show();
    //hides any other error messages on home page
    $('.invalidAddressError').hide();
    $('.noResultsNotification').hide();
}

//INVALIDADDRESSGIVEN FUNCTION - if the user enters an invalid address, shows the .invalidAddressError message
function invalidAddressGiven (form){
    $('.invalidAddressError').show();
    //hides any other error messages on home page
    $('.noResultsNotification').hide();
    $('.noInputError').hide();
    //reset form when xButton is clicked
    $('.xButtonError').click(function(event){
        event.preventDefault();
        form.reset();
    })
}

//SHOWRESULTSPAGE FUNCTION - show resultsPage, .navBar and hides .homePage
function showResultsPage(){
    $('.resultsPage').show();
    $('.navBar').show();
    $('.homePage').hide();
}

//GETRESULTS FUNCTION - using lat and long coordinates, gets list of nearby restaurants using 
//google maps nearby places api
function getResults(resultLat, resultLong,userInput,form){
    //the map variable must be created and is present in index.html, but is not displayed
    let map;
    let center = {lat: resultLat, lng: resultLong};
    map = new google.maps.Map(document.getElementById('map'), {
        center:center, //center of map is lat and long for input address
        zoom:13 //arbitrary number, since not displaying map
    });
    let request = {
        location: center,
        rankBy: google.maps.places.RankBy.DISTANCE,
        types: ['restaurant'] //search for restaurants only 
    };
    let service = new google.maps.places.PlacesService(map);
    //callback function
    let callback = function(result,status,pagination){
        //if no results for valid address, calls notifyUserResults function
        if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS){
            notifyUserNoResults(form);
        }
        //if there is an error, alert the user
        if(status == 'ERROR'){
            alert('There was an error retrieving the data. Please check your internet connection or try again later.')
        }
        //if status is OK, loop through each of the nearby restaurants 
        if (status == google.maps.places.PlacesServiceStatus.OK){
            let restaurantList = result;
            for (let i=0;i<restaurantList.length;i++){
                let id = restaurantList[i].id;
                let placeId = restaurantList[i].place_id;
                checkWalkingTime(restaurantList[i],center,placeId,id,userInput); //calls this function, which calculates the travel time for each restaurant
            }
            //if more than 20 results, goes through next 20 results, up to 60 total
            if (pagination.hasNextPage){
                sleep:2;
                pagination.nextPage();
            }
            showResultsPage();
        }
    }
    service.nearbySearch(request, callback);
}

//NOTIFYUSERNORESULTS FUNCTION - if the user has given a valid address, but there are no results, 
//show .noResultsNotification on home page
function notifyUserNoResults(form){
    //undisable submit, remove reset button
    form.submit.disabled=false;
    form.submit.value='Submit';
    $('.reset').remove();
    form.submit.style.width='100%';
    $('.noResultsNotification').show();
    //hides any other error messages on home page
    $('.noInputError').hide();
    $('.invalidAddressError').hide();
    //reset form when xButton is clicked
    $('.xButtonError').click(function(event){
        event.preventDefault();
        form.reset();
    })
}

//CHECKWALKINGTIME FUNCTION - uses google distance matrix api to determine the amount of time it would 
//take to walk from user address to restaurant - done for each restaurant 
function checkWalkingTime(restaurantList, center, placeId,id,userInput){
    let origin = center;
    let destination = restaurantList.vicinity;
    let request={
        origins: [origin],
        destinations: [destination],
        travelMode: 'WALKING',
        unitSystem: google.maps.UnitSystem.IMPERIAL
    }
    //callback function
    let callback = function(results,status){
        //if error status, log to console
        if(status == 'ERROR'){
            console.log('There was an error retrieving the walking time data.')
        }
        //if status is OK, gets walking duration 
        if(status == 'OK'){
            //checks that each result has travel time calculated - rare: in some cases, restaurant does not have valid address
            //in system, which throws an error
            if(results.rows[0].elements[0].status=='OK'){
                let matrixDistanceResult = results;
                let duration = matrixDistanceResult.rows[0].elements[0].duration.value;
                let durationMinutes = matrixDistanceResult.rows[0].elements[0].duration.text;
                let distance = matrixDistanceResult.rows[0].elements[0].distance.text;
                //calls lessThanThirty function, which takes travel info and determines if walk time is less than 30 min
                lessThanThirty(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,placeId,id,userInput);
            }
        }
    }
    let service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(request,callback);
}

//LESSTHANTHIRTY FUNCTION - if walking time is less than 30 mins (1800 sec), will keep in result list, create a rating
//variable, and calculate the driving distance with getDrivingDistance function
function lessThanThirty(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,placeId,id,userInput){
    if(duration<=1800){ 
        restaurantList.duration = duration;
        //if restaurant has ratings ... 
        if(restaurantList.hasOwnProperty('rating')){
            //remove decimal places of rating number
            let ratingLong = restaurantList.rating;
            let ratingShort = `Rating: ${ratingLong.toFixed(1)}/5`; 
            getDrivingDistance(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort, placeId,id,userInput);
        }
        //if restaurant has no ratings ... 
        else{
            let ratingShort = 'No Reviews';
            getDrivingDistance(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort, placeId,id,userInput);
        }
     } 
}

//GETDRIVINGDISTANCE FUNCTION - for each remaining result (less than 30 min walk), calculate the drive 
//distance using google maps distance matrix api
function getDrivingDistance(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort, placeId,id,userInput){
    let origin = center;
    let destination = restaurantList.vicinity;  
    let request={
        origins: [origin],
        destinations: [destination],
        travelMode: 'DRIVING'
    }
    //callback function
    let callback = function(results,status){
        //if there is an error, log to console
         if(status == 'ERROR'){
            console.log('There was an error retrieving the driving distance data.')
        }
        //if status is OK ... 
        if(status == 'OK'){
            //convert from meter to miles 
            let driveDistanceMeters = results.rows[0].elements[0].distance.value;
            let driveDistanceMiles = driveDistanceMeters/1609.344;
            //calls calculateFootprint function 
            calculateFootprint(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort,driveDistanceMiles,placeId,id,userInput);
        }
    } 
    let service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(request,callback);
}

//CALCULATESFOOTPRINT FUNCTION - calculates carbon emission in grams using driving distance
function calculateFootprint(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort,driveDistanceMiles, placeId,id,userInput){
    //adds 1 to resultsCount variable for each result that is rendered
    resultsCount++;
    //calls addHeader function 
    addHeader(userInput);
    let emissionLong = driveDistanceMiles * 357;
    //remove decimal places of emission calculation
    let emission = emissionLong.toFixed(1);  
    //finally... renders the results
    renderResults(restaurantList, durationMinutes, distance, matrixDistanceResult,ratingShort,emission,placeId,id)
}

//ADDHEADER FUNCTION - adds html to header that informs user they are seeing results for the inputted address
function addHeader(userInput){
    $('.resultsCount').html(`${resultsCount}`);
    $('.userInput').html(`${userInput}`);
}

//RENDERRESULTS FUNCTION - creates divs for each result and appends it to resultsPage section 
function renderResults(restaurantList, durationMinutes, distance, matrixDistanceResult,ratingShort,emission,placeId,id){
    //includes separate divs for phoneView, compView, and popUpContainer
    $('.allResults').append(
        `<div class="resultContainer"> 
            <div class="phoneView">
                <div class='mainInfoContainer'>
                    <div class="nameAndAddressContainer">
                        <h2>${restaurantList.name}</h2>
                        <p class="addressPhone">${restaurantList.vicinity}</p>
                    </div>
                    <button class="${id} moreInfoButton">More Info</button>
                </div>
                <div class='travelInfo'>
                    <p>${durationMinutes} away <i class="fas fa-walking"></i></p> 
                    <p class="carbonInfo">Save ${emission} grams of CO<sub>2</sub> emissions by walking <i class="fas fa-globe-americas"></i></p>
                </div>        
            </div>
            <div class="compView">
                <section class="compBox restNameBox">
                    <h2>${restaurantList.name}</h2>
                </section>  
                <section class="compBox distanceInfoBox">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>${restaurantList.vicinity}</p>
                    <p>${distance} away</p>
                </section>
                <section class="compBox ratingBox">
                    <i class="fas fa-star"></i>
                    <p>${ratingShort}</p>
                </section>
                <section class="compBox emissionsInfoBox">
                    <p>${durationMinutes} away <i class="fas fa-walking"></i></p> 
                    <p class="carbonInfo">Save ${emission} grams of CO<sub>2</sub> emissions by walking <i class="fas fa-globe-americas"></i></p>
                </section>
            </div>
        </div>`);
    $('.resultsPage').append(
        `<div class = "${placeId} popUpContainer popUpResult hidden">
            <div class="popUpInfo">
                <button class="xButton xButtonResult">X</button>
                <h2>${restaurantList.name}</h2>
                <div class="extraInfoBox">
                    <div class="infoBullet">
                        <i class="fas fa-map-marker-alt"></i>
                        <p>${restaurantList.vicinity}</p>
                    </div>
                    <div class="infoBullet">
                        <i class="fas fa-star"></i>
                        <p>${ratingShort}</p>
                    </div>
                    <div class="infoBullet">
                        <i class="fas fa-walking"></i>
                        <div class="popUpTravel">
                            <p>${durationMinutes} away</p>  
                            <p>${distance} away</p>
                        </div>
                    </div>
                    <div class="infoBullet">
                        <i class="fas fa-globe-americas"></i>
                        <p>Save ${emission} grams of CO<sub>2</sub> emissions by walking instead of driving!</p>
                    </div>
                </div>
            </div>
        </div>`);
    resultsPopUpButtonClicked(placeId,id); 
}

//RESULTSPOPUPBUTTONCLICKED FUNCTION - if moreInfoButton is clicked (named using id), shows 
//popUpContainer (named using placeId) to show more info 
function resultsPopUpButtonClicked(placeId,id){
    $(`.${id}`).click(function(event){
        event.preventDefault();
        $(`.${placeId}`).show();
        $('.allResults').css('overflow-y', 'hidden')
        document.getElementById('toTopButton').style.zIndex = '1';
    })
    //calls xButtonResultClicked function
    xButtonResultClicked(placeId,id);
}

//XBUTTONRESULTCLICKED FUNCTION - if the .xButtonResult button is clicked, hides the popUpContainer
function xButtonResultClicked(placeId,id){
    $('.xButtonResult').click(function(event){
        event.preventDefault();
        $(`.${placeId}`).hide();
        $('.allResults').css('overflow-y', 'scroll')
        document.getElementById('toTopButton').style.zIndex = '100';
   })
}


//NEWSEARCHCLICKED FUNCTION - when newSearchButton is clicked, the page is reloaded, and user is taken 
//back to homePage
function newSearchClicked(){
    $('.newSearchButton').click(function(event){
        event.preventDefault();
        window.location.reload(false);
        //resets resultsCount
        resultsCount=0;
    })
}

//CALCULATIONSBUTTONCLICKED FUNCTION - when carbonCalculations button is clicked, the calculationsContainer 
//is displayed
function calculationsButtonClicked(){
    $('.carbonCalculations').click(function(event){
        event.preventDefault();
        $('.calculationsContainer').show();
        $('.allResults').hide();
    })
}


//XBUTTONCLICKED - when xButton is clicked, the calculationsContainer is hidden
function xButtonClicked(){
    $('.xButton').click(function(event){
        event.preventDefault();
        $('.popUpContainer').hide();
        $('.allResults').show();
    })
}

//TOTOP FUNCTION - shows .toTopButton when user scrolls from top of doc
function toTop(){
$("main").scroll(function(){
    $('.toTopButton').toggleClass('scrolled', $(this).scrollTop() > 200);
});
}

//TOTOPBUTTONCLICKED FUNCTION - if .toTopButton is clicked, take user to top of page
function toTopButtonClicked(){
    $('.toTopButton').click(function(event){
        $('main').animate({ scrollTop: 0 }, 'fast');
    })
}

//RENDERAPP FUNCTION - calls all functions necessary to render app
function renderApp(){
    makeInputAutocomplete();
    watchFormSubmit();   
    newSearchClicked(); 
    calculationsButtonClicked();
    xButtonClicked();
    toTop();
    toTopButtonClicked();
};

$(renderApp);
