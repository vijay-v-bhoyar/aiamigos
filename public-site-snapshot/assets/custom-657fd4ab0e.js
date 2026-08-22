/**
 * Exoplanet Custom JS
 *
 * @package Exoplanet
 *
 * Distributed under the MIT license - http://opensource.org/licenses/MIT
 */
var menu_width="";
jQuery(function($){
  menu_width=parseInt(jQuery("#menu-width").text().trim());
  /* Mobile responsive Menu*/
  document.getElementById("open_nav").addEventListener("click", open);
      function open() {
          document.getElementById("sidebar1").style.width = menu_width + "px";
          document.getElementById("sidebar1").style.display = "block";
          document.getElementById("sidebar1").style.transform = "translate3d(0, 0, 0)";
  }
  document.getElementById("close_nav").addEventListener("click", close);
      function close() {
          document.getElementById("sidebar1").style.width = "0";
          document.getElementById("sidebar1").style.display = "none";
  }

  jQuery('.search-icon > i').click(function(){
      jQuery(".serach_outer").slideDown(700);  
  });

  jQuery('.closepop i').click(function(){
      jQuery(".serach_outer").slideUp(700);
  });
});

openAllPanels = function(aId) {
  console.log("setAllPanelOpen");
  jQuery(aId + ' .panel-collapse:not(".in")').collapse('show');
}
closeAllPanels = function(aId) {
  console.log("setAllPanelclose");
  jQuery(aId + ' .panel-collapse.in').collapse('hide');
}

jQuery(function() {
  //----- OPEN
  jQuery('[data-popup-open]').on('click', function(e) {
    var targeted_popup_class = jQuery(this).attr('data-popup-open');
    jQuery('[data-popup="' + targeted_popup_class + '"]').fadeIn(350);

    e.preventDefault();
  });

  //----- CLOSE
  jQuery('[data-popup-close]').on('click', function(e) {
    var targeted_popup_class = jQuery(this).attr('data-popup-close');
    jQuery('[data-popup="' + targeted_popup_class + '"]').fadeOut(350);

    e.preventDefault();
  });
});

jQuery('document').ready(function(){
   
    var partner_loop="";
    var records_loop="";
    var classes_loop="";
    var testimonial_loop="";
    var blog_loop="";
  
    if(jQuery("#partners-loop").text()=='true')
    {
      partner_loop=true;
    }else{
      partner_loop=false;
    }

    if(jQuery("#records-loop").text()=='true')
    {
      records_loop=true;
    }else{
      records_loop=false;
    }

    if(jQuery("#classes-loop").text()=='true')
    {
      classes_loop=true;
    }else{
      classes_loop=false;
    }
    if(jQuery("#testimonials-loop").text()=='true')
    {
      testimonial_loop=true;
    }else{
      testimonial_loop=false;
    }
    if(jQuery("#blog-loop").text()=='true')
    {
      blog_loop=true;
    }else{
      blog_loop=false;
    }

    var owl = jQuery('#partners-details .owl-carousel');
      owl.owlCarousel({
      margin: 20,
      nav:false,
      autoplay : true,
      lazyLoad: true,
      autoplayTimeout: 5000,
      loop: partner_loop,
      dots: false,
      autoplayHoverPause:true,
      navText : ['<i class="fa fa-chevron-left" aria-hidden="true"></i>','<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
      responsive: {
        0: {
          items: 1
        },
        320: {
          items: 2
        },
        500: {
          items: 2
        },
        600: {
          items: 3
        },
        800: {
          items: 3
        },
        900: {
          items: 3
        },
        1000: {
          items: 4
        }
      },
      autoplayHoverPause : true,
      mouseDrag: true
    });
    var owl = jQuery('#our-records .owl-carousel');
      owl.owlCarousel({
      margin: 20,
      nav:false,
      autoplay : true,
      lazyLoad: true,
      autoplayTimeout: 5000,
      loop: records_loop,
      dots: true,
      autoplayHoverPause:true,
      navText : ['<i class="fa fa-chevron-left" aria-hidden="true"></i>','<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
      responsive: {
        0: {
          items: 1
        },
        500: {
          items: 2
        },
        700: {
          items: 2
        },
        767: {
          items: 3
        },
        1000: {
          items: 4
        }
      },
      autoplayHoverPause : true,
      mouseDrag: true
    });
    var owl = jQuery('#our-classes .owl-carousel');
      owl.owlCarousel({
      margin: 20,
      nav:false,
      autoplay : true,
      lazyLoad: true,
      autoplayTimeout: 5000,
      loop: classes_loop,
      dots: true,
      autoplayHoverPause:true,
      navText : ['<i class="fa fa-chevron-left" aria-hidden="true"></i>','<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
      responsive: {
        0: {
          items: 1
        },
        500: {
          items: 1
        },
        600: {
          items: 1
        },
        700: {
          items: 2
        },
        900: {
          items: 2
        },
        1000: {
          items: 2
        }
      },
      autoplayHoverPause : true,
      mouseDrag: true
    });
    var owl = jQuery('#testimonials .owl-carousel');
      owl.owlCarousel({
      margin: 25,
      nav: false,
      autoplay : true,
      lazyLoad: true,
      autoplayTimeout: 5000,
      loop: testimonial_loop,
      dots: true,
      autoplayHoverPause:true,
      navText : ['<i class="fa fa-chevron-left" aria-hidden="true"></i>','<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
      responsive: {
        0: {
          items: 1
        },
        600: {
          items: 1
        },
        650: {
          items: 1
        },
        1000: {
          items: 1
        }
      },
      autoplayHoverPause : true,
      mouseDrag: true
    }); 

    var owl = jQuery('#our-blogs .owl-carousel');
      owl.owlCarousel({
      margin: 30,
      nav:false,
      autoplay : true,
      lazyLoad: true,
      autoplayTimeout: 5000,
      loop: blog_loop,
      dots: true,
      autoplayHoverPause:true,
      navText : ['<i class="fa fa-chevron-left" aria-hidden="true"></i>','<i class="fa fa-chevron-right" aria-hidden="true"></i>'],
      responsive: {
        0: {
          items: 1
        },
        500: {
          items: 1
        },
        600: {
          items: 1
        },
        800: {
          items: 2
        },
        1000: {
          items: 2
        }
      },
      autoplayHoverPause : true,
      mouseDrag: true
    });
});

var interval=null;
function show_loading_box(){
  jQuery(".spinner-box").css("display","none");
  clearInterval(interval);
}

jQuery('document').ready(function(){

  interval = setInterval(show_loading_box,2000);
  
  var count_no="yes";
  jQuery('#our-records').on('appear',function(){
    if(count_no=="yes")
    {
      count_no="no";
      jQuery('.count').each(function () {
        jQuery(this).prop('Counter',0).animate({
            Counter: jQuery(this).text()
        }, {
            duration: 8000,
            easing: 'swing',
            step: function (now) {
               jQuery(this).text(Math.ceil(now));
            }
        });
      });
    }
  });     
  jQuery('#our-records').appear(); 

  // ------------ Scroll Top ---------------

  jQuery(window).scroll(function() {
    if (jQuery(this).scrollTop() >= 50) {        // If page is scrolled more than 50px
      jQuery('#return-to-top').fadeIn(200);    // Fade in the arrow
    } else {
      jQuery('#return-to-top').fadeOut(200);   // Else fade out the arrow
    }
  });
  jQuery('#return-to-top').click(function() {      // When arrow is clicked
    jQuery('body,html').animate({
      scrollTop : 0                       // Scroll to top of body
    }, 2000);
  });


  // ------------ Video Popup ----------
  
  jQuery('#myBtn').click(function()
  {
    jQuery("#myNewModal").css("display","block");

  });
  jQuery('.close-one').click(function()
  {
    jQuery("#myNewModal").css("display","none");

  });

  // ------------ Sticky Navbar -------------------

  var stickyon=jQuery('#sticky-onoff').text().trim();
  var a1=stickyon.length;
  window.onscroll = function() {
    if(a1==3){
      myScrollNav();
    }
    
  }

  var navbar = document.getElementById("sticky-menu");
  var sticky = navbar.offsetTop;
  function myScrollNav() {
    // alert("Hii");
    if (window.pageYOffset > sticky) {
      //alert(window.pageYOffset);
      navbar.classList.add("sticky");
      navbar.classList.add("stickynavbar");
    } else {
      navbar.classList.remove("sticky");
      navbar.classList.remove("stickynavbar");
    }
  }
jQuery('#slider .owl-dots .owl-dot').append('<span class="slider-dots">dots</span>');
jQuery('#testimonials .owl-dots .owl-dot').append('<span class="testimonial-dots">dots</span>');
jQuery('#our-blogs .owl-dots .owl-dot').append('<span class="blog-dots">dots</span>');
jQuery('#our-records .owl-dots .owl-dot').append('<span class="records-dots">dots</span>');
jQuery('#our-classes .owl-dots .owl-dot').append('<span class="classes-dots">dots</span>');
jQuery('#partners-details .owl-nav .owl-prev').append('<span class="partners-dots">nav</span>');
jQuery('#our-blogs .owl-nav .owl-prev').append('<span class="blog-dots">nav</span>');
jQuery('#our-blogs .owl-nav .owl-next').append('<span class="blog-dots">nav</span>');
jQuery('#testimonials .owl-nav .owl-prev').append('<span class="testimonials-dots">nav</span>');
jQuery('#testimonials .owl-nav .owl-next').append('<span class="testimonials-dots">nav</span>');
jQuery('#our-records .owl-nav .owl-prev').append('<span class="our-records-dots">nav</span>');
jQuery('#our-records .owl-nav .owl-next').append('<span class="our-records-dots">nav</span>');
jQuery('#partners-details .owl-nav .owl-prev').append('<span class="partners-details-dots">nav</span>');
jQuery('#partners-details .owl-nav .owl-next').append('<span class="partners-details-dots">nav</span>');
});
