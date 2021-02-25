for i in $(seq 4 24); do 
	cd "s$i";
	cp -rf max min;
	cd min;
	magick mogrify -resize 40% *;
	cd ../..;
done
