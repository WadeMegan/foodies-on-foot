'use strict'

function pageLoad(){
    //$('.homePage').hide();
    $('.navBar').hide();
    $('.resultsPage').hide();
}

//make address input field autocomplete using Google Maps autocomplete API 
function makeInputAutocomplete(){
    let input = new google.maps.places.Autocomplete(document.getElementById('autocomplete'));
}

//Watch address form for submit. On submit, create variable called userInput
//and let it equal the user-iputted address and calls getCoordinates function
function watchFormSubmit(){
    $("form").submit(function(event){
        event.preventDefault();
        let userInput = $('#autocomplete').val();
    
        getCoordinates(userInput);
        
    })
}

//takes userInput variable and gives lat and long using Google Maps geocoder API
//and calls getResults function within callback function
function getCoordinates(userInput){
    var geocoder = new google.maps.Geocoder();

    var results = {
        address: userInput
    }
    
    var callback = function(results,status){ 
        var resultLat = results[0].geometry.location.lat();
        var resultLong=  results[0].geometry.location.lng(); 
        getResults(resultLat, resultLong);
    }

    geocoder.geocode(results,callback);

    //call addHeader function
    addHeader(userInput);
}

//adds html to header that informs user they are seeing results for the inputted address
function addHeader(userInput){
    $('.showingFor').html(`Showing results for ${userInput}.`)
}

//using latitude and longitude data, gets list of nearby restaurants using 
//Google Maps Places API
function getResults(resultLat, resultLong){

    var map;
    var center = {lat: resultLat, lng: resultLong};



    map = new google.maps.Map(document.getElementById('map'), {
        center:center,
        zoom:13
    });

    var request = {
        location: center,
        radius:2254,
        types: ['restaurant']
    };

    var service = new google.maps.places.PlacesService(map);

    var callback = function(results,status){
        var restaurantList=results;
        
        for (let i=0;i<restaurantList.length;i++){
            checkWalkingTime(restaurantList[i],center); //calls this function, which calculates the travel time for each restaurant
        }
    
    }

    service.nearbySearch(request, callback);
}


//uses Google distance matrix api to calculate travel info for individual restaurants when walking
//and calls renderResults function to determine that duration is under 30 min
function checkWalkingTime(restaurantList, center){

    var origin = center;
    var destination = restaurantList.vicinity;
    
    var request={
        origins: [origin],
        destinations: [destination],
        travelMode: 'WALKING',
        unitSystem: google.maps.UnitSystem.IMPERIAL,
    }

    var callback = function(results,status){
        if(status == google.maps.places.PlacesServiceStatus.OK){
            var matrixDistanceResult = results;
            
            var duration = matrixDistanceResult.rows[0].elements[0].duration.value;
            var durationMinutes = matrixDistanceResult.rows[0].elements[0].duration.text;
            var distance = matrixDistanceResult.rows[0].elements[0].distance.text;

            //calls this function, which takes travel info and determines if walk time is less than 30 min
            lessThanThirty(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult);
            
        }
    }

    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(request,callback);

}

//if walking time is less than 30 mins, add result to results section
function lessThanThirty(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult){
  
    //remove decimal places of rating number
    var ratingLong = restaurantList.rating;
    var ratingShort = ratingLong.toFixed(1);

    if(duration<=1800){
        //calls function, for restaurants under 30 min walk, calculated driving distance
        getDrivingDistance(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort);
    }
}

//for each result, calculate the drive distance value in meters and convert to miles
function getDrivingDistance(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort){
    var origin = center;
    var destination = restaurantList.vicinity;
    
    var request={
        origins: [origin],
        destinations: [destination],
        travelMode: 'DRIVING',
    }

    var callback = function(results,status){
        var driveDistanceMeters = results.rows[0].elements[0].distance.value;
        var driveDistanceMiles = driveDistanceMeters/1609.344;
        calculateFootprint(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort,driveDistanceMiles);
    } 
        

    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(request,callback);
}


//calculates co2 emission
function calculateFootprint(restaurantList, center,duration,durationMinutes, distance, matrixDistanceResult,ratingShort,driveDistanceMiles){
    
    var emissionLong = driveDistanceMiles * 357;
  
    //remove decimal places of emission calculation
    var emission = emissionLong.toFixed(1);  
    

    renderResults(restaurantList, durationMinutes, distance, matrixDistanceResult,ratingShort,emission);

}


//creates divs for each result and appends it to resultsPage section 
function renderResults(restaurantList, durationMinutes, distance, matrixDistanceResult,ratingShort,emission){

    $('.allResults').append(
        `<div class="resultContainer"> 
            <section class="pictures"></section> 
            <section class="mainInfo">
                <p>${restaurantList.name}</p>
                <p>${restaurantList.vicinity}</p>
            </section> 
            <section class="rating">
                <p>Rating:${ratingShort}/5</p>
            </section>
            <section class="travelInfo">
                <p>${durationMinutes}</p>  
                <p>${distance}</p>
            </section>
            <section class="emissionsInfo">
                <p>${emission} grams of CO2</p>
            </section>
        </div>`);

    //show resultsPage after all results have been loaded
    $('.resultsPage').show();
    $('.navBar').show();
    $('.homePage').hide();
}

//when newSearchButton is clicked, the page is reloaded
function newSearchClicked(){
    $('.newSearchButton').click(function(event){
        event.preventDefault();
        window.location.reload(false);
    })
}


//calls all functions necessary to render app
function renderApp(){
    pageLoad();
    makeInputAutocomplete();
    watchFormSubmit();   
    newSearchClicked(); 
};

$(renderApp);
