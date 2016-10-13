QUnit.test( 'expand_hash' , function( assert ) {
	assert.equal(expand_hash('test1;'), 'test1;\n', 'Plain variable');
	assert.equal(expand_hash('#test1;'), 'ins.test1;\n', 'Single input variable');
	assert.equal(expand_hash('#test1.something;'), 'ins.test1.something;\n', 'Single input variable property');
	assert.equal(expand_hash('#test1 = #test2;'), 'outs.test1 = ins.test2;\n', 'Single assignment');
	assert.equal(expand_hash('#test1 = #test2 = #test3;'), 'outs.test1 = outs.test2 = ins.test3;\n', 'Double assignment');
	assert.equal(expand_hash('#test1 = foo(#test6, #test2 = #test3, #test4) * #test5;'), 'outs.test1 = foo(ins.test6, outs.test2 = ins.test3, ins.test4) * ins.test5;\n', 'Assignment in function');
	assert.equal(expand_hash('[#test1, #test2] = [#test3, #test4];'), '[outs.test1, outs.test2] = [ins.test3, ins.test4];\n', 'Array destructuring');

	assert.equal(expand_hash('#test1 += #test2;'), 'ins.test1 += ins.test2;\n', '+= Assignment');
	assert.equal(expand_hash('#test1 -= #test2;'), 'ins.test1 -= ins.test2;\n', '-= Assignment');
	assert.equal(expand_hash('#test1 *= #test2;'), 'ins.test1 *= ins.test2;\n', '*= Assignment');
	assert.equal(expand_hash('#test1 /= #test2;'), 'ins.test1 /= ins.test2;\n', '/= Assignment');
	assert.equal(expand_hash('#test1 %= #test2;'), 'ins.test1 %= ins.test2;\n', '%= Assignment');
	assert.equal(expand_hash('#test1 **= #test2;'), 'ins.test1 **= ins.test2;\n', '**= Assignment');
	assert.equal(expand_hash('#test1 <<= #test2;'), 'ins.test1 <<= ins.test2;\n', '<<= Assignment');
	assert.equal(expand_hash('#test1 >>= #test2;'), 'ins.test1 >>= ins.test2;\n', '>>= Assignment');
	assert.equal(expand_hash('#test1 >>>= #test2;'), 'ins.test1 >>>= ins.test2;\n', '>>>= Assignment');
	assert.equal(expand_hash('#test1 &= #test2;'), 'ins.test1 &= ins.test2;\n', '&= Assignment');
	assert.equal(expand_hash('#test1 ^= #test2;'), 'ins.test1 ^= ins.test2;\n', '^= Assignment');
	assert.equal(expand_hash('#test1 |= #test2;'), 'ins.test1 |= ins.test2;\n', '|= Assignment');

	assert.equal(expand_hash('#test1 == #test2;'), 'ins.test1 == ins.test2;\n', '== Comparison');
	assert.equal(expand_hash('#test1 != #test2;'), 'ins.test1 != ins.test2;\n', '!= Comparison');
	assert.equal(expand_hash('#test1 === #test2;'), 'ins.test1 === ins.test2;\n', '=== Comparison');
	assert.equal(expand_hash('#test1 !== #test2;'), 'ins.test1 !== ins.test2;\n', '!== Comparison');
	assert.equal(expand_hash('#test1 > #test2;'), 'ins.test1 > ins.test2;\n', '> Comparison');
	assert.equal(expand_hash('#test1 >= #test2;'), 'ins.test1 >= ins.test2;\n', '>= Comparison');
	assert.equal(expand_hash('#test1 < #test2;'), 'ins.test1 < ins.test2;\n', '< Comparison');
	assert.equal(expand_hash('#test1 <= #test2;'), 'ins.test1 <= ins.test2;\n', '<= Comparison');

	assert.equal(expand_hash('#test1 = #test2;\n#test3 == #test4;'),'outs.test1 = ins.test2;\nins.test3 == ins.test4;\n', 'Multiple lines');
});
